import type { GameState } from './types';

/**
 * Heti liga — Nap 2 (lásd docs/HETI-TERV.md).
 *
 * Nulla backend, nulla szerverköltség, nulla GDPR-teher: az ellenfelek a hét
 * sorszámából és a játékos saját haladásából (bestShift) determinisztikusan
 * generálódnak, tehát mindenki ugyanazt látja, és a nehézség a saját
 * teljesítményhez igazodik — nem unalmas egy erős, nem demoralizáló egy
 * gyenge játékosnak.
 *
 * A pontozás kizárólag a műszak-teljesítményből jön (lásd store.ts awardShift),
 * nem a megvásárolható bevételből — így a liga nem pay-to-win.
 */

export interface Division {
  id: number;
  name: string;
  emoji: string;
}

export const DIVISIONS: Division[] = [
  { id: 0, name: 'Bronze', emoji: '🥉' },
  { id: 1, name: 'Silver', emoji: '🥈' },
  { id: 2, name: 'Gold', emoji: '🥇' },
  { id: 3, name: 'Platinum', emoji: '💠' },
  { id: 4, name: 'Diamond', emoji: '👑' },
];

export const LEAGUE_SIZE = 20;
export const PROMOTE_COUNT = 4;
export const RELEGATE_COUNT = 4;
const WEEK_MS = 7 * 86_400_000;

export function weekNumber(now = Date.now()): number {
  return Math.floor(now / WEEK_MS);
}

/** Egyszerű, stabil hash 0..1 közé — nem kell kriptográfia, csak ismételhetőség. */
function hash01(...parts: number[]): number {
  let seed = 0;
  for (const p of parts) seed += p * 12.9898;
  const v = Math.sin(seed) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Szimulált botok heti pontszáma. A horgony a játékos legjobb műszakja
 * (bestShift) — így az ellenfelek a saját haladásával nőnek, nem egy fix
 * globális görbével.
 */
export function botScores(s: GameState, week: number, division: number): number[] {
  const anchor = Math.max(20, s.bestShift);
  const scores: number[] = [];
  for (let i = 0; i < LEAGUE_SIZE - 1; i++) {
    const r = hash01(week, division * 97 + 1, i * 13.37 + 3);
    // A divízió szintje 0.55..1.27-szeresére húzza a botok erejét a horgonyhoz képest.
    const tierMult = 0.55 + division * 0.18;
    const spread = 0.5 + r * 1.1; // 0.5 .. 1.6
    // ~6 műszaknyi teljesítmény összege egy hét alatt.
    scores.push(Math.round(anchor * tierMult * spread * 6));
  }
  return scores;
}

export function rankOf(playerPoints: number, bots: number[]): number {
  return bots.filter((b) => b > playerPoints).length + 1;
}

export interface WeekOutcome {
  weekNumber: number;
  division: number;
  rank: number;
  promoted: boolean;
  relegated: boolean;
  gems: number;
  fragments: number;
}

export function resolveWeek(s: GameState, forWeek: number, division: number, points: number): WeekOutcome {
  const bots = botScores(s, forWeek, division);
  const rank = rankOf(points, bots);
  const promoted = rank <= PROMOTE_COUNT && division < DIVISIONS.length - 1;
  const relegated = rank > LEAGUE_SIZE - RELEGATE_COUNT && division > 0;
  const gems = Math.max(2, Math.round(((LEAGUE_SIZE - rank + 1) * (1 + division * 0.4)) / 2));
  const fragments = rank <= PROMOTE_COUNT ? 3 : rank <= LEAGUE_SIZE - RELEGATE_COUNT ? 1 : 0;
  return { weekNumber: forWeek, division, rank, promoted, relegated, gems, fragments };
}

export function nextDivision(division: number, outcome: WeekOutcome): number {
  if (outcome.promoted) return Math.min(DIVISIONS.length - 1, division + 1);
  if (outcome.relegated) return Math.max(0, division - 1);
  return division;
}

/** A divízióhoz kötött állandó bevétel-bónusz — csak addig jár, amíg ott állsz. */
export function leagueMult(division: number): number {
  return 1 + division * 0.02;
}

/** Az aktuális hét hátralévő ideje (UI-hoz). */
export function msUntilWeekEnd(now = Date.now()): number {
  const start = weekNumber(now) * WEEK_MS;
  return start + WEEK_MS - now;
}
