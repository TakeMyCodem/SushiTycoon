import { STATIONS } from './config';
import { BASE_SLOTS } from './chefs';
import { REPUTATION_START } from './management';
import { weekNumber } from './league';
import type { GameState, StationState } from './types';

/**
 * Minimális, érvényes `GameState` a teszteknek — szándékosan **nem** a
 * `store.ts` `freshState()`-jét használja (az zustand-ot importálna, és
 * lassítaná/bonyolítaná a tiszta logika tesztelését). Csak azokat a
 * mezőket állítja be, amikre a tesztelt függvények ténylegesen támaszkodnak;
 * a hívó felülírhat bármit a `overrides`-szal.
 */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  const stations: Record<string, StationState> = {};
  for (const s of STATIONS) stations[s.id] = { level: 0, manager: false, progress: 0, running: false };

  const base: GameState = {
    money: 0, gems: 0, lifetime: 0, runEarnings: 0, stars: 0, starsSpent: 0,
    stations,
    upgrades: [], perks: {}, achievements: [],
    activeQuests: [], doneQuests: [],
    abilityReady: {}, effects: [], event: null,
    nextEventAt: 0,
    vip: false, noAds: false,
    lastSeen: 0, createdAt: 0,
    dailyStreak: 0, lastDaily: 0,
    chefs: {}, roster: [], slots: BASE_SLOTS,
    priceTier: 1, reputation: REPUTATION_START, stock: {}, contracts: [], managementUnlocked: false,
    shiftReadyAt: 0, bestShift: 0,
    stats: {
      taps: 0, adsWatched: 0, managersHired: 0, upgradesBought: 0,
      prestiges: 0, vipCaught: 0, abilitiesUsed: 0, rushesSeen: 0,
      shiftsPlayed: 0, customersServed: 0,
    },
    league: { weekNumber: weekNumber(), division: 0, points: 0 },
    lastLeagueOutcome: null,
    michelinRankSeen: 0,
  };
  return { ...base, ...overrides };
}
