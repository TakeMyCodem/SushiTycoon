import type { GameState } from './types';
import { STATIONS, STATION_BY_ID } from './config';
import { cycleIncome, cycleMs } from './math';
import { chefBonus } from './chefs';

/**
 * Menedzsment-réteg: árazás, hírnév, alapanyag.
 *
 * A cél nem "több gomb", hanem hogy legyen a játékban egy **mozgó optimum**.
 * Az ár akkor a legjövedelmezőbb, ha épp annyit kérsz, amennyit a hírneved elbír —
 * és mivel a hírnév folyamatosan változik, a tegnapi jó döntés ma már nem az.
 * Ez az, amit egy statikus szorzó soha nem tud megadni.
 */

export interface PriceTier {
  id: number;
  name: string;
  emoji: string;
  /** Bevétel-szorzó adagonként. */
  price: number;
  desc: string;
}

export const PRICE_TIERS: PriceTier[] = [
  { id: 0, name: 'Cafeteria Price', emoji: '🥢', price: 0.7, desc: 'Cheap, but brings a crowd' },
  { id: 1, name: 'Friendly', emoji: '🍵', price: 1.0, desc: 'Balanced' },
  { id: 2, name: 'City Average', emoji: '🏙️', price: 1.3, desc: 'Asking a bit more' },
  { id: 3, name: 'Premium', emoji: '🥂', price: 1.7, desc: 'Only worth it with a good reputation' },
  { id: 4, name: 'Luxury', emoji: '💠', price: 2.2, desc: 'Few guests, lots of money' },
];

/** A management-réteg ennyi megnyitott fogástól kapcsol be. */
export const MANAGEMENT_UNLOCK_STATIONS = 3;
/** Bekapcsoláskor ennyi órányi alapanyagot kap ajándékba minden nyitott fogás. */
export const STARTING_STOCK_HOURS = 8;
/** Egy újonnan megnyitott fogás ennyi órányi indulókészletet kap. */
export const NEW_STATION_STOCK_HOURS = 3;

/* ---------- Hírnév ---------- */

export const REPUTATION_START = 50;

/**
 * Az ártűrés: mennyit kérhetsz el, mielőtt elfogynak a vendégek.
 * 0 hírnévnél 0.6, 100-nál 2.2 — a jó hírnév szó szerint felárat ér.
 */
export function priceTolerance(reputation: number): number {
  return 0.6 + (Math.max(0, Math.min(100, reputation)) / 100) * 1.6;
}

/**
 * Az árrugalmasság. Ezt a számot NE állítsd találomra: ez dönti el, hány
 * árszint lehet valaha optimális. A nettó bevétel csúcsa p* = (1 + k·tűrés) / 2k,
 * vagyis 0,7-tel a csúcs 0,93-tól 1,81-ig vándorol a hírnévvel — épp végigsöpri
 * a Barátságos → Városi átlag → Prémium lépcsőt. Nagyobb k-nál minden szint
 * ugyanaz marad, és a döntés eltűnik a játékból.
 */
const PRICE_ELASTICITY = 0.7;

/**
 * Kereslet az árhoz és a hírnévhez képest. Ez szorozza a ciklussebességet:
 * drágábban kevesebb vendég jön, tehát lassabban forog a pult.
 */
export function demandFor(price: number, reputation: number): number {
  const d = 1 + (priceTolerance(reputation) - price) * PRICE_ELASTICITY;
  return Math.max(0.15, Math.min(1.5, d));
}

/** A hírnév önmagában is ad egy kis bevétel-bónuszt (±25%). */
export function reputationMult(reputation: number): number {
  return 1 + (reputation - REPUTATION_START) / 200;
}

/** Az aktuális árszint szorzója. */
export function priceOf(s: GameState): number {
  return PRICE_TIERS[s.priceTier]?.price ?? 1;
}

/**
 * Nettó hatás a bevételre: ár × kereslet. Ezt mutatjuk a játékosnak,
 * hogy a döntés ne találgatás legyen — a mozgó optimum akkor jó játék,
 * ha látod a görbét, nem ha vaktában tapogatod.
 */
export function netRate(price: number, reputation: number): number {
  return price * demandFor(price, reputation);
}

/** Melyik árszint a legjobb a jelenlegi hírnévvel? (UI-tipp) */
export function bestTierFor(reputation: number): number {
  let best = 0;
  let bestVal = 0;
  for (const t of PRICE_TIERS) {
    const v = netRate(t.price, reputation);
    if (v > bestVal) {
      bestVal = v;
      best = t.id;
    }
  }
  return best;
}

/* ---------- Alapanyag ---------- */

/**
 * Napi piaci szorzó. Determinisztikus a napból és az állomásból számolva:
 * minden játékos ugyanazt látja aznap, és nem lehet újratöltéssel újrasorsolni.
 */
export function marketFactor(stationId: string, dayIndex = dayNumber()): number {
  const i = STATIONS.findIndex((s) => s.id === stationId);
  // Egyszerű, stabil hash — nem kell kriptográfia, csak ismételhetőség.
  const seed = Math.sin(dayIndex * 12.9898 + i * 78.233) * 43758.5453;
  const frac = seed - Math.floor(seed);
  return 0.7 + frac * 0.6; // 0.7 .. 1.3
}

export function dayNumber(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

/**
 * Egy adag alapanyag alapára = az adag bevételének 20%-a.
 *
 * Miért arányos és nem fix: fix árnál a késői játékban az alapanyag elhanyagolható
 * aprópénz lenne, és a döntés eltűnne. Így viszont az alapanyag mindig a bevétel
 * ötöde, tehát a piaci időzítés (±30%) és a mennyiségi kedvezmény (-20%) végig
 * érezhető marad — összesen ~7% profit múlik azon, hogy okosan vásárolsz-e.
 *
 * Az ideiglenes hatásokat (boost, csúcsforgalom) szándékosan kihagyjuk a
 * számításból, különben boost alatt drágább lenne a beszerzés.
 */
export const INGREDIENT_COST_RATIO = 0.2;

export function baseIngredientCost(s: GameState, stationId: string): number {
  const def = STATION_BY_ID[stationId];
  const st = s.stations[stationId];
  if (!def || !st || st.level === 0) return 1;
  const stable: GameState = { ...s, effects: [], event: null };
  // Beszerzési séf (Hana): olcsóbb alapanyag.
  const discount = 1 - chefBonus(s, 'ingredient', 'global') / 100;
  return Math.max(1, cycleIncome(stable, def) * INGREDIENT_COST_RATIO * Math.max(0.3, discount));
}

export function ingredientPrice(s: GameState, stationId: string, dayIndex = dayNumber()): number {
  return baseIngredientCost(s, stationId) * marketFactor(stationId, dayIndex);
}

/**
 * Hány adag fedez adott számú órányi termelést az állomáson.
 * A boltban ezért **időt** árulunk, nem darabszámot: a játékos így azonnal
 * érti, mit vesz, és nem kell fejben osztania a ciklusidővel.
 */
export function servingsForHours(s: GameState, stationId: string, hours: number): number {
  const def = STATION_BY_ID[stationId];
  const st = s.stations[stationId];
  if (!def || !st || st.level === 0) return 0;
  return Math.ceil((hours * 3_600_000) / cycleMs(s, def, st.level));
}

/** Mennyi ideig tart még a meglévő készlet. */
export function stockDurationMs(s: GameState, stationId: string): number {
  const def = STATION_BY_ID[stationId];
  const st = s.stations[stationId];
  if (!def || !st || st.level === 0 || !st.manager) return Infinity;
  return (s.stock[stationId] ?? 0) * cycleMs(s, def, st.level);
}

/** Vásárolható csomagok — órában, nem darabban. */
export const STOCK_PACKS = [1, 6, 24];

/** Mennyiségi kedvezmény: a nagy tétel olcsóbb, ezért érdemes előre gondolkodni. */
export function bulkDiscount(hours: number): number {
  if (hours >= 24) return 0.8;
  if (hours >= 6) return 0.9;
  return 1;
}

export function stockCostForHours(s: GameState, stationId: string, hours: number, dayIndex = dayNumber()): number {
  const qty = servingsForHours(s, stationId, hours);
  return ingredientPrice(s, stationId, dayIndex) * qty * bulkDiscount(hours);
}

/**
 * A beszállítói szerződés ára — 40 órányi alapanyag értéke.
 * Szándékosan komoly beruházás: ha olcsó lenne, mindenki azonnal megvenné,
 * és a piaci időzítés mint döntés kikerülne a játékból.
 */
export function contractCost(s: GameState, stationId: string): number {
  return baseIngredientCost(s, stationId) * servingsForHours(s, stationId, 40);
}

/** A szerződés kényelmi felára: aki maga vásárol, ennyit spórol. */
export const CONTRACT_MARKUP = 1.15;
/** A szerződés ennyi óra alá csökkent készletnél tölt újra, és eddig tölt fel. */
export const CONTRACT_REFILL_BELOW_HOURS = 1;
export const CONTRACT_REFILL_TO_HOURS = 8;

export function hasStock(s: GameState, stationId: string): boolean {
  if (!s.managementUnlocked) return true;
  return (s.stock[stationId] ?? 0) > 0;
}

/** Hány adagot tud még kiszolgálni az állomás (management előtt végtelen). */
export function servingsLeft(s: GameState, stationId: string): number {
  if (!s.managementUnlocked) return Infinity;
  return s.stock[stationId] ?? 0;
}
