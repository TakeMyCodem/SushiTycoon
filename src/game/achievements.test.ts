import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from './achievements';
import { makeState } from './test-helpers';

describe('ACHIEVEMENTS data integrity', () => {
  it('has no duplicate ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ACHIEVEMENT_BY_ID indexes every achievement', () => {
    for (const a of ACHIEVEMENTS) expect(ACHIEVEMENT_BY_ID[a.id]).toBe(a);
  });

  it('none are already done on a fresh state — a typo like ">= 0" would silently pre-unlock one', () => {
    const s = makeState();
    for (const a of ACHIEVEMENTS) {
      expect(a.done(s), `${a.id} (${a.name}) should not be done on a fresh state`).toBe(false);
    }
  });

  it('every achievement becomes done once its predicate is trivially satisfied at a very high stat baseline', () => {
    // A sanity sweep: crank every relevant field way up and confirm every
    // predicate can actually FIRE — catches an impossible/inverted condition
    // (e.g. accidentally using `<=` instead of `>=`) that "starts false" alone wouldn't.
    const stations = { ...makeState().stations };
    for (const id of Object.keys(stations)) stations[id] = { level: 900, manager: true, progress: 0, running: true };
    const chefs: Record<string, { fragments: number; level: number }> = {};
    for (let i = 0; i < 10; i++) chefs[`chef${i}`] = { fragments: 0, level: 5 };
    const maxed = makeState({
      stations,
      stats: {
        taps: 1e6, adsWatched: 0, managersHired: 10, upgradesBought: 100, prestiges: 10,
        vipCaught: 1000, abilitiesUsed: 1000, rushesSeen: 1000, shiftsPlayed: 1000, customersServed: 1_000_000,
      },
      upgrades: Array.from({ length: 40 }, (_, i) => `u${i}`),
      stars: 1000, starsSpent: 1000,
      chefs,
      reputation: 100,
      contracts: ['maki', 'nigiri', 'sashimi'],
      bestShift: 1000,
      perks: { golden_touch: 5 },
      dailyStreak: 30,
      league: { weekNumber: 0, division: 4, points: 0 },
    });
    for (const a of ACHIEVEMENTS) {
      expect(a.done(maxed), `${a.id} (${a.name}) should be reachable`).toBe(true);
    }
  });

  it('exact boundary values count as done (predicates use >=, not >)', () => {
    const s = makeState({ stats: { ...makeState().stats, taps: 100 } });
    expect(ACHIEVEMENT_BY_ID.a_tap100.done(s)).toBe(true);
    const oneShort = makeState({ stats: { ...makeState().stats, taps: 99 } });
    expect(ACHIEVEMENT_BY_ID.a_tap100.done(oneShort)).toBe(false);
  });

  it('a_star100 counts spent stars too, not just the free pool (matches the Michelin-rank design intent)', () => {
    const s = makeState({ stars: 40, starsSpent: 60 });
    expect(ACHIEVEMENT_BY_ID.a_star100.done(s)).toBe(true);
  });
});
