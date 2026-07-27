import type { GameState } from './types';
import { STATIONS } from './config';

/**
 * Küldetéslánc — a "mit csináljak most?" kérdésre ad választ.
 *
 * Mindig 3 aktív küldetés fut. Ha egyet teljesítesz, a láncból bejön a következő.
 * A lánc szándékosan vegyíti a passzív (érj el X-et) és az aktív
 * (használj képességet, kapj el VIP-et) célokat — így a játékos megtanulja
 * használni a rendszereket, nem csak nézi a számokat.
 */
export interface QuestDef {
  id: string;
  name: string;
  target: number;
  /** Aktuális haladás. */
  progress: (s: GameState) => number;
  reward: { gems?: number; cashSeconds?: number };
}

const totalLevels = (s: GameState) => STATIONS.reduce((n, d) => n + s.stations[d.id].level, 0);
const managerCount = (s: GameState) => STATIONS.filter((d) => s.stations[d.id].manager).length;
const unlockedCount = (s: GameState) => STATIONS.filter((d) => s.stations[d.id].level > 0).length;

export const QUESTS: QuestDef[] = [
  { id: 'q1',  name: 'Get Maki Roll to level 25', target: 25, progress: (s) => s.stations.maki.level, reward: { gems: 10 } },
  { id: 'q2',  name: 'Unlock 2 dishes', target: 2, progress: unlockedCount, reward: { gems: 10 } },
  { id: 'q3',  name: 'Hire 1 manager', target: 1, progress: managerCount, reward: { cashSeconds: 300 } },
  { id: 'q4',  name: 'Buy 1 upgrade', target: 1, progress: (s) => s.upgrades.length, reward: { gems: 15 } },
  { id: 'q5',  name: 'Use a manager ability', target: 1, progress: (s) => s.stats.abilitiesUsed, reward: { gems: 15 } },
  { id: 'qs1', name: 'Complete a shift', target: 1, progress: (s) => s.stats.shiftsPlayed, reward: { gems: 20 } },
  { id: 'q6',  name: 'Get Maki to level 50', target: 50, progress: (s) => s.stations.maki.level, reward: { cashSeconds: 600 } },
  { id: 'q7',  name: 'Unlock 4 dishes', target: 4, progress: unlockedCount, reward: { gems: 20 } },
  { id: 'q8',  name: 'Catch 1 VIP guest', target: 1, progress: (s) => s.stats.vipCaught, reward: { gems: 25 } },
  { id: 'q9',  name: 'Hire 3 managers', target: 3, progress: managerCount, reward: { cashSeconds: 900 } },
  { id: 'q10', name: 'Reach 100 total levels', target: 100, progress: totalLevels, reward: { gems: 25 } },
  { id: 'q11', name: 'Buy 5 upgrades', target: 5, progress: (s) => s.upgrades.length, reward: { gems: 30 } },
  { id: 'q12', name: 'Survive 1 rush hour', target: 1, progress: (s) => s.stats.rushesSeen, reward: { cashSeconds: 1200 } },
  { id: 'qc1', name: 'Hire a chef for your kitchen', target: 1, progress: (s) => Object.values(s.chefs).filter((c) => c.level > 0).length, reward: { gems: 25 } },
  { id: 'qm1', name: 'Raise your reputation to 65', target: 65, progress: (s) => Math.round(s.reputation), reward: { gems: 30 } },
  { id: 'qm2', name: 'Sign a supplier contract', target: 1, progress: (s) => s.contracts.length, reward: { gems: 25 } },
  { id: 'qs2', name: 'Serve 100 total customers in shifts', target: 100, progress: (s) => s.stats.customersServed, reward: { gems: 40 } },
  { id: 'q13', name: 'Unlock 6 dishes', target: 6, progress: unlockedCount, reward: { gems: 35 } },
  { id: 'q14', name: 'Use 5 abilities', target: 5, progress: (s) => s.stats.abilitiesUsed, reward: { gems: 35 } },
  { id: 'q15', name: 'Reach level 100 in any dish', target: 100, progress: (s) => Math.max(...STATIONS.map((d) => s.stations[d.id].level)), reward: { cashSeconds: 1800 } },
  { id: 'q16', name: 'Catch 5 VIP guests', target: 5, progress: (s) => s.stats.vipCaught, reward: { gems: 40 } },
  { id: 'q17', name: 'Hire 6 managers', target: 6, progress: managerCount, reward: { gems: 50 } },
  { id: 'qc2', name: 'Collect 5 chefs', target: 5, progress: (s) => Object.values(s.chefs).filter((c) => c.level > 0).length, reward: { gems: 50 } },
  { id: 'qs3', name: 'Score 60 points in a shift', target: 60, progress: (s) => s.bestShift, reward: { gems: 60 } },
  { id: 'q18', name: 'Reach 300 total levels', target: 300, progress: totalLevels, reward: { cashSeconds: 2400 } },
  { id: 'q19', name: 'Unlock every dish', target: STATIONS.length, progress: unlockedCount, reward: { gems: 60 } },
  { id: 'q20', name: 'Get 15 upgrades', target: 15, progress: (s) => s.upgrades.length, reward: { gems: 60 } },
  { id: 'q21', name: 'Open a new restaurant (prestige)', target: 1, progress: (s) => s.stats.prestiges, reward: { gems: 100 } },
  { id: 'q22', name: 'Earn 50 Michelin stars', target: 50, progress: (s) => s.stars + s.starsSpent, reward: { gems: 80 } },
  { id: 'q23', name: 'Reach 800 total levels', target: 800, progress: totalLevels, reward: { gems: 100 } },
  { id: 'q24', name: 'Open 3 new restaurants', target: 3, progress: (s) => s.stats.prestiges, reward: { gems: 150 } },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<string, QuestDef>;

/** Az első 3 küldetés indításkor. */
export function initialQuests(): string[] {
  return QUESTS.slice(0, 3).map((q) => q.id);
}

/** A lánc következő, még nem aktív és nem teljesített küldetése. */
export function nextQuestId(active: string[], done: string[]): string | null {
  const q = QUESTS.find((x) => !active.includes(x.id) && !done.includes(x.id));
  return q ? q.id : null;
}
