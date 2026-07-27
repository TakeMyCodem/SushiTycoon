import type { GameState } from './types';
import { STATION_BY_ID } from './config';

/**
 * Séf-gyűjtemény — a személyzet és a gyűjtögetés egy rendszerben.
 *
 * **Szándékosan NEM gacha.** Nincs véletlen doboz, nincs "pörgetés": minden séf
 * ismert áron, töredékekből szerezhető, és a játékos maga választja meg, melyiket
 * gyűjti. Ez kihagy egy egész szabályozási területet (több EU-ország korlátozza a
 * loot boxot), miközben a gyűjtési motiváció megmarad — sőt, a célzott gyűjtés
 * *jobban* motivál, mert a haladás látható és tervezhető.
 *
 * A döntés itt a **kinevezés**: kevés konyhai hely van, tehát melyik séfet teszed be,
 * és melyik iskola-szinergiát építed ki.
 */

export type Rarity = 'gyakori' | 'ritka' | 'epikus' | 'legendas';

/** A séf iskolája — az azonos iskolájú séfek együtt bónuszt adnak. */
export type School = 'hagyomany' | 'modern' | 'utcai';

export type ChefEffect =
  | { kind: 'income'; target: string | 'all'; pct: number }
  | { kind: 'speed'; target: string | 'all'; pct: number }
  | { kind: 'shift'; pct: number }
  | { kind: 'ingredient'; pct: number }
  | { kind: 'reputation'; pct: number }
  | { kind: 'offline'; pct: number };

export interface ChefDef {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  school: School;
  /** A hatás 1. szinten; szintenként ennyivel nő. */
  effect: ChefEffect;
  flavor: string;
  /**
   * "Recept-kombó" (Nap 3, végjáték): ha ez a séf a konyhában van, ÉS ez a
   * fogás meg van nyitva, extra `COMBO_BONUS_PCT` bevétel jár rá — a séf
   * alap hatásától függetlenül, azon felül. Nem szintezhető (fix érték),
   * hogy egyszerű maradjon a fejben tartani, melyik séf melyik fogást tolja.
   * Ez ad okot a roster cserélgetésére a végjátékban: amelyik fogást épp
   * fejleszted, azt a fogást combózó séfet érdemes beültetni.
   */
  comboDish: string;
}

export const RARITY: Record<Rarity, { label: string; color: string; fragments: number; maxLevel: number }> = {
  gyakori: { label: 'Common', color: '#9a90bd', fragments: 8, maxLevel: 5 },
  ritka: { label: 'Rare', color: '#5ac8ff', fragments: 15, maxLevel: 5 },
  epikus: { label: 'Epic', color: '#b47bff', fragments: 30, maxLevel: 5 },
  legendas: { label: 'Legendary', color: '#ffc247', fragments: 60, maxLevel: 5 },
};

export const SCHOOLS: Record<School, { label: string; emoji: string }> = {
  hagyomany: { label: 'Tradition', emoji: '🏯' },
  modern: { label: 'Modern', emoji: '🔬' },
  utcai: { label: 'Street', emoji: '🛵' },
};

/** Azonos iskolájú séfekből 2 együtt ennyi extra globális bevételt ad. */
export const SYNERGY_PCT = 8;
/** Recept-kombó: séf a saját fogásán ennyi extra (nem szintezhető) bevételt ad. */
export const COMBO_BONUS_PCT = 15;

export const CHEFS: ChefDef[] = [
  {
    id: 'yuki', name: 'Yuki', emoji: '👩‍🍳', rarity: 'gyakori', school: 'hagyomany',
    effect: { kind: 'income', target: 'maki', pct: 25 },
    flavor: 'The intern turned counter lead. Maki is a religion to her.',
    comboDish: 'maki',
  },
  {
    id: 'hiro', name: 'Hiro', emoji: '🧑‍🍳', rarity: 'gyakori', school: 'hagyomany',
    effect: { kind: 'income', target: 'nigiri', pct: 25 },
    flavor: 'Same motion for twenty years, and he still keeps refining it.',
    comboDish: 'nigiri',
  },
  {
    id: 'nao', name: 'Nao', emoji: '🌙', rarity: 'gyakori', school: 'modern',
    effect: { kind: 'offline', pct: 12 },
    flavor: 'Works the night shift. While you sleep, she works.',
    comboDish: 'dragon',
  },
  {
    id: 'mei', name: 'Mei', emoji: '🛵', rarity: 'gyakori', school: 'utcai',
    effect: { kind: 'speed', target: 'temaki', pct: 15 },
    flavor: 'Hands you the temaki before you finish ordering.',
    comboDish: 'temaki',
  },
  {
    id: 'aiko', name: 'Aiko', emoji: '🔪', rarity: 'ritka', school: 'hagyomany',
    effect: { kind: 'speed', target: 'sashimi', pct: 22 },
    flavor: 'Knows a blade is sharp enough just by the sound.',
    comboDish: 'sashimi',
  },
  {
    id: 'hana', name: 'Hana', emoji: '🌸', rarity: 'ritka', school: 'modern',
    effect: { kind: 'ingredient', pct: 12 },
    flavor: 'Suppliers fear her. Undefeated at the negotiating table.',
    comboDish: 'wagyu',
  },
  {
    id: 'ren', name: 'Ren', emoji: '🔥', rarity: 'ritka', school: 'utcai',
    effect: { kind: 'income', target: 'tempura', pct: 35 },
    flavor: 'Gauges the oil temperature by touch.',
    comboDish: 'tempura',
  },
  {
    id: 'kenji', name: 'Kenji', emoji: '💪', rarity: 'ritka', school: 'hagyomany',
    effect: { kind: 'income', target: 'all', pct: 10 },
    flavor: 'Carries the whole fish back from the market. On foot.',
    comboDish: 'ramen',
  },
  {
    id: 'sora', name: 'Sora', emoji: '🍜', rarity: 'epikus', school: 'modern',
    effect: { kind: 'speed', target: 'all', pct: 12 },
    flavor: 'Redesigned her kitchen with a stopwatch. Twice.',
    comboDish: 'uramaki',
  },
  {
    id: 'goro', name: 'Goro', emoji: '🎩', rarity: 'epikus', school: 'utcai',
    effect: { kind: 'reputation', pct: 50 },
    flavor: 'Calls everyone by name. Everyone.',
    comboDish: 'kaiseki',
  },
  {
    id: 'takeshi', name: 'Takeshi', emoji: '⚡', rarity: 'epikus', school: 'utcai',
    effect: { kind: 'shift', pct: 25 },
    flavor: 'Only really slows down inside, during the rush.',
    comboDish: 'sashimi',
  },
  {
    id: 'ryu', name: 'Ryu', emoji: '🐉', rarity: 'epikus', school: 'modern',
    effect: { kind: 'income', target: 'all', pct: 18 },
    flavor: 'The Dragon Roll is his recipe. He won\'t tell you the rest.',
    comboDish: 'dragon',
  },
  {
    id: 'ito', name: 'Master Ito', emoji: '🏆', rarity: 'legendas', school: 'hagyomany',
    effect: { kind: 'income', target: 'all', pct: 30 },
    flavor: 'Earned three stars out of a twelve-seat counter.',
    comboDish: 'kaiseki',
  },
];

export const CHEF_BY_ID = Object.fromEntries(CHEFS.map((c) => [c.id, c])) as Record<string, ChefDef>;

/** Egy töredék ára gyémántban a boltban (fix ár, nincs szerencsefaktor). */
export const FRAGMENT_GEM_COST: Record<Rarity, number> = {
  gyakori: 4, ritka: 8, epikus: 15, legendas: 30,
};

/** Konyhai helyek: az első kettő ingyen, a többi gyémántért. */
export const BASE_SLOTS = 2;
export const MAX_SLOTS = 5;
export const SLOT_COSTS = [150, 400, 900];

export function slotCost(currentSlots: number): number | null {
  const idx = currentSlots - BASE_SLOTS;
  return idx >= 0 && idx < SLOT_COSTS.length ? SLOT_COSTS[idx] : null;
}

export interface ChefState {
  fragments: number;
  level: number;
}

export function chefState(s: GameState, id: string): ChefState {
  return s.chefs[id] ?? { fragments: 0, level: 0 };
}

/** Hány töredék kell a következő szintre (0. szint = megszerzés). */
export function fragmentsForNext(def: ChefDef, level: number): number | null {
  if (level >= RARITY[def.rarity].maxLevel) return null;
  const base = RARITY[def.rarity].fragments;
  // 1. szint a teljes alapár, utána szintenként a fele annyival több.
  return Math.round(base * (1 + level * 0.6));
}

/** A hatás értéke az adott szinten. Az 1. szint az alapérték. */
export function effectValue(def: ChefDef, level: number): number {
  if (level <= 0) return 0;
  return def.effect.pct * (1 + (level - 1) * 0.5);
}

/** A kinevezett séfek listája (csak a megszerzettek számítanak). */
export function activeChefs(s: GameState): ChefDef[] {
  return s.roster
    .map((id) => CHEF_BY_ID[id])
    .filter((c): c is ChefDef => !!c && chefState(s, c.id).level > 0);
}

/**
 * Iskola-szinergia: minden iskolából a 2. kinevezett séf +8% globális bevételt ad.
 * Ez teszi a kinevezést valódi döntéssé — nem elég a legerősebb hármat betenni,
 * az összeállításnak is van értéke.
 */
export function synergyBonus(s: GameState): number {
  const counts: Record<string, number> = {};
  for (const c of activeChefs(s)) counts[c.school] = (counts[c.school] ?? 0) + 1;
  let pairs = 0;
  for (const n of Object.values(counts)) pairs += Math.floor(n / 2);
  return pairs * SYNERGY_PCT;
}

/**
 * Séf-hatások összege. A `scope` szándékosan kötelező: a globális ('all') hatás
 * a `globalMult`-ban számít, az állomás-specifikus a `cycleIncome`-ban — ha a
 * kettőt egy hívás adná vissza, a globális séfek kétszer szoroznának.
 *
 * - `global`: csak a target: 'all' és a target nélküli hatások
 * - `station`: csak az adott állomásra szólók
 * - `both`: mindkettő (ott jó, ahol egyszer szerepel, pl. ciklusidő)
 */
export function chefBonus(
  s: GameState,
  kind: ChefEffect['kind'],
  scope: 'global' | 'station' | 'both',
  stationId?: string,
): number {
  let total = 0;
  for (const c of activeChefs(s)) {
    if (c.effect.kind !== kind) continue;
    const target = 'target' in c.effect ? c.effect.target : 'all';
    const isGlobal = target === 'all';
    if (scope === 'global' && !isGlobal) continue;
    if (scope === 'station' && (isGlobal || target !== stationId)) continue;
    if (scope === 'both' && !isGlobal && target !== stationId) continue;
    total += effectValue(c, chefState(s, c.id).level);
  }
  return total;
}

/**
 * Recept-kombó bónusz egy adott állomásra: minden kinevezett séf, akinek ez
 * a `comboDish`-e, ad `COMBO_BONUS_PCT`-et — halmozódik, ha véletlenül két
 * combo-séf is épp ugyanazt a fogást célozza (pl. sashimi: Aiko + Takeshi).
 * Fix érték, nem szintezhető: a döntés a kinevezés, nem a fejlesztés.
 */
export function comboBonus(s: GameState, stationId: string): number {
  return activeChefs(s).filter((c) => c.comboDish === stationId).length * COMBO_BONUS_PCT;
}

/** Igaz, ha legalább egy kinevezett séfnek ez a fogás a "signature dish"-e. */
export function hasCombo(s: GameState, stationId: string): boolean {
  return activeChefs(s).some((c) => c.comboDish === stationId);
}

/** A séf hatásának olvasható leírása adott szinten. */
export function describeEffect(def: ChefDef, level: number): string {
  const v = Math.round(effectValue(def, Math.max(1, level)));
  const dishName = (id: string) => STATION_BY_ID[id]?.name ?? id;
  switch (def.effect.kind) {
    case 'income':
      return def.effect.target === 'all' ? `All income +${v}%` : `${dishName(def.effect.target)} income +${v}%`;
    case 'speed':
      return def.effect.target === 'all' ? `All cycles ${v}% faster` : `${dishName(def.effect.target)} cycle ${v}% faster`;
    case 'shift':
      return `Shift points +${v}%`;
    case 'ingredient':
      return `Ingredients ${v}% cheaper`;
    case 'reputation':
      return `Reputation gain +${v}%`;
    case 'offline':
      return `Offline income +${v}%`;
  }
}

/**
 * A nap séfje: minden nap más séf töredékeit adja a napi jutalom és a műszak.
 * Determinisztikus a napból, tehát mindenki ugyanazt kapja, és nem lehet
 * újratöltéssel kicsikarni egy jobbat.
 */
export function chefOfTheDay(dayIndex: number): ChefDef {
  return CHEFS[dayIndex % CHEFS.length];
}
