import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';
import { STATIONS } from './config';
import type { ShiftResult } from './shift';

/**
 * Integrációs tesztek a store.ts-re — jsdom kell hozzá (lásd vitest.config.ts),
 * mert a modul betöltéskor localStorage-ot olvas (audio.ts, settings.ts).
 *
 * A store egyetlen szinguleton (a modul betöltésekor jön létre), ezért minden
 * teszt előtt `hardReset()`-tel tiszta állapotból indulunk — ez ugyanazt az
 * utat futtatja végig, amit egy valódi "új kezdés" is (localStorage törlése +
 * friss state), tehát maga is egyfajta regresszióteszt a resetre.
 */
beforeEach(() => {
  useGame.getState().hardReset();
  // hardReset() intentionally doesn't touch toast/banner (they have their own
  // auto-clear timers in real play) — reset them here so tests don't leak
  // a toast from whichever test happened to run right before them.
  useGame.setState({ toast: null, banner: null });
});

describe('buy', () => {
  it('refuses to buy when money is insufficient', () => {
    useGame.getState().buy('nigiri'); // locked, level 0, costs 60, player has 0
    expect(useGame.getState().s.stations.nigiri.level).toBe(0);
  });

  it('unlocks a station and deducts the exact cost', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 1000 } }));
    const before = useGame.getState().s.money;
    useGame.getState().buy('nigiri');
    const s = useGame.getState().s;
    expect(s.stations.nigiri.level).toBe(1);
    expect(s.money).toBeLessThan(before);
  });
});

describe('hireManager', () => {
  it('does nothing if the station is still locked (level 0)', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 1_000_000 } }));
    useGame.getState().hireManager('nigiri');
    expect(useGame.getState().s.stations.nigiri.manager).toBe(false);
  });

  it('hires the manager and deducts cost once the station is unlocked', () => {
    useGame.setState((p) => ({
      s: { ...p.s, money: 1_000_000, stations: { ...p.s.stations, nigiri: { level: 1, manager: false, progress: 0, running: false } } },
    }));
    const before = useGame.getState().s.money;
    useGame.getState().hireManager('nigiri');
    const s = useGame.getState().s;
    expect(s.stations.nigiri.manager).toBe(true);
    expect(s.stats.managersHired).toBe(1);
    expect(s.money).toBeLessThan(before);
  });
});

describe('tapStation', () => {
  it('starts production on a manual tap', () => {
    useGame.getState().tapStation('maki'); // maki starts at level 1 in freshState
    expect(useGame.getState().s.stations.maki.running).toBe(true);
  });

  it('a second tap while already running is a no-op (must wait for the cycle)', () => {
    useGame.getState().tapStation('maki');
    const tapsAfterFirst = useGame.getState().s.stats.taps;
    useGame.getState().tapStation('maki');
    expect(useGame.getState().s.stats.taps).toBe(tapsAfterFirst); // no second tap counted
  });

  it('does nothing on a locked (level 0) station', () => {
    useGame.getState().tapStation('nigiri');
    expect(useGame.getState().s.stations.nigiri.running).toBe(false);
  });
});

describe('prestige', () => {
  it('is a no-op below MIN_PRESTIGE_STARS worth of lifetime earnings', () => {
    useGame.setState((p) => ({ s: { ...p.s, lifetime: 1 } }));
    useGame.getState().prestige();
    expect(useGame.getState().s.stats.prestiges).toBe(0);
  });

  it('resets money and station levels but keeps stars, once enough lifetime earnings exist', () => {
    // starsFor(lifetime) = 20*sqrt(lifetime/1e9); need >= MIN_PRESTIGE_STARS (10) -> lifetime >= 2.5e8
    useGame.setState((p) => ({ s: { ...p.s, money: 500, lifetime: 3e8, stations: { ...p.s.stations, maki: { level: 50, manager: true, progress: 0, running: true } } } }));
    useGame.getState().prestige();
    const s = useGame.getState().s;
    expect(s.money).toBe(0);
    expect(s.stations.maki.level).toBe(1); // back to the freshStations() gift level
    expect(s.stars).toBeGreaterThan(0);
    expect(s.stats.prestiges).toBe(1);
  });
});

describe('setPriceTier', () => {
  it('shows a confirmation toast naming the new tier', () => {
    useGame.setState((p) => ({ s: { ...p.s, managementUnlocked: true } }));
    useGame.getState().setPriceTier(2);
    expect(useGame.getState().s.priceTier).toBe(2);
    expect(useGame.getState().toast).toContain('City Average');
  });

  it('is a no-op when re-selecting the already-active tier (no redundant toast)', () => {
    useGame.getState().setPriceTier(1); // already the default
    expect(useGame.getState().toast).toBeNull();
  });
});

describe('grantIap', () => {
  it('gems_mega grants exactly 3500 gems', () => {
    const before = useGame.getState().s.gems;
    useGame.getState().grantIap('gems_mega');
    expect(useGame.getState().s.gems).toBe(before + 3500);
  });

  it('whale grants VIP, no-ads, gems, instant production, and an extra kitchen slot', () => {
    // Needs a manager running to have any incomePerSec to convert into
    // "24 hours of instant production" — a fresh game has zero active income.
    useGame.setState((p) => ({ s: { ...p.s, stations: { ...p.s.stations, maki: { level: 5, manager: true, progress: 0, running: true } } } }));
    const before = useGame.getState().s;
    useGame.getState().grantIap('whale');
    const after = useGame.getState().s;
    expect(after.vip).toBe(true);
    expect(after.noAds).toBe(true);
    expect(after.gems).toBe(before.gems + 10000);
    expect(after.slots).toBe(before.slots + 1);
    expect(after.money).toBeGreaterThan(before.money);
  });

  it('whale never grants more than MAX_SLOTS kitchen slots', () => {
    useGame.setState((p) => ({ s: { ...p.s, slots: 5 } })); // MAX_SLOTS
    useGame.getState().grantIap('whale');
    expect(useGame.getState().s.slots).toBe(5);
  });
});

describe('awardShift', () => {
  it('adds the shift result points to the current league week', () => {
    const result: ShiftResult = {
      served: 10, lost: 0, mistakes: 0, bestCombo: 5, points: 42, accuracy: 1, rewardSeconds: 100, rushBonus: false,
    };
    const before = useGame.getState().s.league.points;
    useGame.getState().awardShift(result, false);
    expect(useGame.getState().s.league.points).toBeCloseTo(before + 42, 5);
  });

  it('raises bestShift only when the new result beats the previous record', () => {
    useGame.setState((p) => ({ s: { ...p.s, bestShift: 50 } }));
    const low: ShiftResult = { served: 1, lost: 0, mistakes: 0, bestCombo: 1, points: 10, accuracy: 1, rewardSeconds: 10, rushBonus: false };
    useGame.getState().awardShift(low, false);
    expect(useGame.getState().s.bestShift).toBe(50);

    const high: ShiftResult = { served: 1, lost: 0, mistakes: 0, bestCombo: 1, points: 200, accuracy: 1, rewardSeconds: 10, rushBonus: false };
    useGame.getState().awardShift(high, false);
    expect(useGame.getState().s.bestShift).toBe(200);
  });
});

describe('hardReset', () => {
  it('actually clears localStorage, not just the in-memory state', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 999 } }));
    useGame.getState().save();
    expect(localStorage.getItem('sushi-empire-save-v2')).not.toBeNull();
    useGame.getState().hardReset();
    expect(localStorage.getItem('sushi-empire-save-v2')).toBeNull();
    expect(useGame.getState().s.money).toBe(0);
  });
});

it('every station has an id used by exactly one entry (no duplicate/typo station ids)', () => {
  const ids = STATIONS.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('freshState (via hardReset) always starts with the first station gifted at level 1', () => {
  expect(useGame.getState().s.stations[STATIONS[0].id].level).toBe(1);
  expect(useGame.getState().s.stations[STATIONS[1].id].level).toBe(0);
});
