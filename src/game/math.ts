import type { Effect, GameState, OfflineReport, StationDef } from './types';
import {
  MILESTONES, OFFLINE_CAP_MS, OFFLINE_CAP_VIP_MS, RUSH_MULT, SPEED_MILESTONES, STAR_BONUS, STATIONS,
} from './config';
import { UPGRADE_BY_ID } from './upgrades';
import { ACHIEVEMENT_BONUS } from './achievements';
import { perkLevel } from './perks';
import { demandFor, priceOf, reputationMult, servingsLeft } from './management';
import { chefBonus, comboBonus, synergyBonus } from './chefs';
import { leagueMult } from './league';
import { michelinMult } from './michelin';

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj',
  'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av',
];

/** Rövid pénzformátum: 1.23M, 4.5B, ... */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 ? n.toFixed(n % 1 === 0 ? 0 : 1) : Math.floor(n).toString();
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  // A SUFFIXES tábla ~1e80-nál elfogy — onnantól tudományos jelölésre váltunk,
  // mert a toFixed egyébként "1e+22"-t ír ki 1e21 fölött, ami törött kijelzés lenne.
  if (tier === SUFFIXES.length - 1 && scaled >= 1e21) return n.toExponential(2);
  return `${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

export function fmtTime(ms: number): string {
  if (ms > 0 && ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function milestoneMult(level: number): number {
  let m = 1;
  for (const ms of MILESTONES) if (level >= ms) m *= 2;
  return m;
}

export function nextMilestone(level: number): number | null {
  for (const ms of MILESTONES) if (level < ms) return ms;
  return null;
}

/** Csak a szintekből jövő ciklusidő-osztó (mérföldkövek). */
function levelSpeedDiv(level: number): number {
  let d = 1;
  for (const ms of SPEED_MILESTONES) if (level >= ms) d *= 2;
  return d;
}

/** Az aktív (le nem járt) hatások szorzata típusonként. */
export function effectMult(state: GameState, kind: Effect['kind'], now = Date.now()): number {
  let m = 1;
  for (const e of state.effects) if (e.kind === kind && e.until > now) m *= e.mult;
  return m;
}

/** A megvett fejlesztések szorzója egy állomásra (a globálisakkal együtt). */
export function upgradeMult(state: GameState, stationId: string | 'all'): number {
  let m = 1;
  for (const id of state.upgrades) {
    const u = UPGRADE_BY_ID[id];
    if (!u) continue;
    if (u.target === 'all' || u.target === stationId) m *= u.mult;
  }
  return m;
}

/**
 * Globális bevételszorzó. Minden állandó és ideiglenes forrás itt fut össze:
 * csillagok, achievementek, perk, VIP, aktív hatások, csúcsforgalom.
 */
export function globalMult(state: GameState, now = Date.now()): number {
  const star = 1 + state.stars * STAR_BONUS;
  const ach = 1 + state.achievements.length * ACHIEVEMENT_BONUS;
  const golden = 1 + perkLevel(state.perks, 'golden_touch') * 0.1;
  const vip = state.vip ? 2 : 1;
  const rush = state.event?.kind === 'rush' && state.event.until > now ? RUSH_MULT : 1;
  // Az árszint és a hírnév csak a menedzsment-réteg bekapcsolása után számít.
  const price = state.managementUnlocked ? priceOf(state) : 1;
  const rep = state.managementUnlocked ? reputationMult(state.reputation) : 1;
  // Séfek: a globális ('all') hatások és az iskola-szinergia.
  const chef = 1 + (chefBonus(state, 'income', 'global') + synergyBonus(state)) / 100;
  const league = leagueMult(state.league.division);
  const michelin = michelinMult(state.stars + state.starsSpent, state.stats.prestiges);
  return star * ach * golden * vip * rush * price * rep * chef * league * michelin * effectMult(state, 'income', now);
}

/**
 * A fejlécben mutatott "szorzó". A globalMult a globális fejlesztéseket nem
 * tartalmazza (azok állomás-szinten szorzódnak), de a játékos számára ezek is
 * ugyanúgy "minden bevételre hatnak" — ezért itt összevonjuk.
 */
export function displayMult(state: GameState, now = Date.now()): number {
  return globalMult(state, now) * upgradeMult(state, 'all');
}

export function cycleMs(state: GameState, def: StationDef, level: number, now = Date.now()): number {
  // A kereslet a pult forgási sebessége: drágábban kevesebb vendég jön.
  const demand = state.managementUnlocked ? demandFor(priceOf(state), state.reputation) : 1;
  const chefSpeed = 1 + chefBonus(state, 'speed', 'both', def.id) / 100;
  return def.cycleMs / (levelSpeedDiv(level) * effectMult(state, 'speed', now) * demand * chefSpeed);
}

/** Egy ciklus bevétele az adott állomáson. */
export function cycleIncome(state: GameState, def: StationDef, now = Date.now()): number {
  const st = state.stations[def.id];
  if (!st || st.level === 0) return 0;
  // Az állomás-specifikus séfbónusz itt jön be; a globális a globalMult-ban van.
  const chef = 1 + chefBonus(state, 'income', 'station', def.id) / 100;
  // Recept-kombó: a séf saját fogásán, a szintezhető hatástól függetlenül.
  const combo = 1 + comboBonus(state, def.id) / 100;
  return (
    def.baseIncome * st.level * milestoneMult(st.level) * upgradeMult(state, def.id)
    * chef * combo * globalMult(state, now)
  );
}

/**
 * Bevétel/másodperc. Alapból csak a managerrel automatizált állomásokból.
 * A kifogyott alapanyagú állomás nem termel — ez szándékosan látszik a fejlécben is,
 * különben a játékos nem értené, miért esett le a bevétele.
 */
export function incomePerSec(state: GameState, now = Date.now(), onlyManaged = true): number {
  let sum = 0;
  for (const def of STATIONS) {
    const st = state.stations[def.id];
    if (!st || st.level === 0) continue;
    if (onlyManaged && !st.manager) continue;
    if (servingsLeft(state, def.id) <= 0) continue;
    sum += cycleIncome(state, def, now) / (cycleMs(state, def, st.level, now) / 1000);
  }
  return sum;
}

/** n szint ára a jelenlegi szintről (geometriai sor). */
export function costFor(def: StationDef, level: number, n: number): number {
  if (n <= 0) return 0;
  const r = def.costMult;
  return (def.baseCost * Math.pow(r, level) * (Math.pow(r, n) - 1)) / (r - 1);
}

/** Hány szintet tudok most megvenni a pénzemből. */
export function maxAffordable(def: StationDef, level: number, money: number): number {
  const r = def.costMult;
  const first = def.baseCost * Math.pow(r, level);
  if (money < first) return 0;
  const n = Math.floor(Math.log(1 + (money * (r - 1)) / first) / Math.log(r));
  return Math.max(0, n);
}

/** Manager ára a Fejvadász perkkel csökkentve. */
export function managerCost(state: GameState, def: StationDef): number {
  return def.managerCost * (1 - perkLevel(state.perks, 'manager_deal') * 0.15);
}

/** Offline plafon: alap + Éjszakai műszak perk, VIP-nél 24 óra. */
export function offlineCapMs(state: GameState): number {
  if (state.vip) return OFFLINE_CAP_VIP_MS;
  return OFFLINE_CAP_MS + perkLevel(state.perks, 'offline') * 3_600_000;
}

/**
 * Offline bevétel: mennyit termelt az étterem, amíg a játékos távol volt.
 * Csak a managerrel automatizált állomások termelnek, ideiglenes hatások nélkül,
 * és a távollét a plafonig számít.
 *
 * Szándékosan tiszta függvény: ez a játék legkényesebb számítása
 * (retention + reklámbevétel múlik rajta), ezért külön tesztelhetőnek kell lennie.
 */
export function offlineEarnings(state: GameState, awayMs: number): OfflineReport | null {
  const ms = Math.min(Math.max(0, awayMs), offlineCapMs(state));
  const base: GameState = { ...state, effects: [], event: null };
  let earned = 0;
  const consumed: Record<string, number> = {};
  let ranDry = false;

  for (const def of STATIONS) {
    const st = base.stations[def.id];
    if (!st || st.level === 0 || !st.manager) continue;
    const possible = ms / cycleMs(base, def, st.level);
    // A készlet a távollétben is fogy — enélkül az alapanyag-gazdálkodás
    // csak egy díszlet lenne, amit kilépéssel meg lehet kerülni.
    const available = servingsLeft(base, def.id);
    const cycles = Math.min(possible, available);
    if (cycles <= 0) continue;
    if (cycles < possible) ranDry = true;
    earned += cycleIncome(base, def) * cycles;
    if (isFinite(available)) consumed[def.id] = cycles;
  }

  // Éjszakás séf: az offline bevétel külön bónuszt kap.
  earned *= 1 + chefBonus(base, 'offline', 'global') / 100;

  // 1 percnél rövidebb távollétnél ne toljunk modált a játékos arcába.
  return awayMs > 60_000 && earned > 0 ? { ms, earned, consumed, ranDry } : null;
}

/** Prestige csillagok az összes valaha keresett pénzből. */
export function starsFor(lifetime: number): number {
  return Math.floor(20 * Math.sqrt(Math.max(0, lifetime) / 1e9));
}

/** Elérhető, még el nem költött csillagok (perkre ez költhető). */
export function availableStars(state: GameState): number {
  return state.stars;
}

/** Egy képesség újratöltési ideje a Gyors kezek perkkel. */
export function abilityCooldown(state: GameState, baseMs: number): number {
  return baseMs * (1 - perkLevel(state.perks, 'quick_hands') * 0.1);
}
