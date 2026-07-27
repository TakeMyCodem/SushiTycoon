import { describe, expect, it } from 'vitest';
import {
  fmt, fmtTime, milestoneMult, cycleIncome, incomePerSec, costFor, maxAffordable,
  offlineCapMs, offlineEarnings, starsFor, abilityCooldown,
} from './math';
import { STATION_BY_ID } from './config';
import { makeState } from './test-helpers';

describe('fmt', () => {
  it('formats small numbers without a suffix', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(4.3)).toBe('4.3');
    expect(fmt(999)).toBe('999');
  });

  it('formats thousands/millions/billions with suffixes', () => {
    expect(fmt(1_000)).toBe('1.00K');
    expect(fmt(1_500_000)).toBe('1.50M');
    expect(fmt(2.5e9)).toBe('2.50B');
  });

  it('handles negative numbers', () => {
    expect(fmt(-4.3)).toBe('-4.3');
    expect(fmt(-1_000)).toBe('-1.00K');
  });

  it('handles Infinity and NaN gracefully', () => {
    expect(fmt(Infinity)).toBe('∞');
    // NaN < 0 is false and NaN < 1000 is also false, so it falls through to
    // the suffix branch — this asserts it doesn't throw, not a specific value.
    expect(() => fmt(NaN)).not.toThrow();
  });

  it('never crashes for huge numbers, and switches to scientific notation once the suffix table runs out', () => {
    // Regression test: toFixed() misbehaves above 1e21 (returns "1e+22"
    // instead of a normal decimal string), which used to leak into the
    // formatted output as "1e+22av". See docs/BALANSZ.md "Nagy számok".
    for (const exp of [10, 30, 50, 80, 81, 90, 99, 150]) {
      const out = fmt(Math.pow(10, exp));
      expect(out).not.toContain('NaN');
      expect(out).not.toMatch(/e\+\d+[a-z]/); // no "1e+22av"-style leakage
    }
    expect(fmt(1e99)).toBe('1.00e+99');
  });
});

describe('milestoneMult', () => {
  it('is 1x below the first milestone', () => {
    expect(milestoneMult(24)).toBe(1);
  });

  it('doubles at each milestone, cumulatively', () => {
    expect(milestoneMult(25)).toBe(2);
    expect(milestoneMult(50)).toBe(4);
    expect(milestoneMult(100)).toBe(8);
  });

  it('is fully cumulative at the top milestone', () => {
    // 10 milestones in config.ts → 2^10
    expect(milestoneMult(800)).toBe(1024);
  });
});

describe('cycleIncome', () => {
  it('is zero for a station at level 0', () => {
    const s = makeState();
    expect(cycleIncome(s, STATION_BY_ID.maki)).toBe(0);
  });

  it('scales linearly with level before any milestone', () => {
    const def = STATION_BY_ID.maki;
    const s1 = makeState({ stations: { ...makeState().stations, maki: { level: 1, manager: false, progress: 0, running: false } } });
    const s10 = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: false, progress: 0, running: false } } });
    const inc1 = cycleIncome(s1, def);
    const inc10 = cycleIncome(s10, def);
    expect(inc10).toBeCloseTo(inc1 * 10, 6);
  });
});

describe('starsFor', () => {
  it('gives zero stars for zero or negative lifetime earnings', () => {
    expect(starsFor(0)).toBe(0);
    expect(starsFor(-100)).toBe(0);
  });

  it('matches the documented formula: 20 * sqrt(lifetime / 1e9)', () => {
    expect(starsFor(2.5e8)).toBe(10); // BALANSZ.md's "~1 óra" reference point
  });
});

describe('fmtTime', () => {
  it('shows sub-10s durations with one decimal', () => {
    expect(fmtTime(3500)).toBe('3.5s');
  });

  it('shows whole seconds under a minute', () => {
    expect(fmtTime(45_000)).toBe('45s');
  });

  it('shows minutes and seconds under an hour', () => {
    expect(fmtTime(90_000)).toBe('1m 30s');
  });

  it('shows hours and minutes at/above an hour', () => {
    expect(fmtTime(3_661_000)).toBe('1h 1m');
  });

  it('never goes negative for an already-expired timer', () => {
    expect(fmtTime(-500)).toBe('0s');
  });
});

describe('costFor / maxAffordable', () => {
  const def = STATION_BY_ID.maki;

  it('buying 0 levels costs 0', () => {
    expect(costFor(def, 0, 0)).toBe(0);
  });

  it('maxAffordable finds exactly as many levels as costFor confirms are affordable', () => {
    const money = 10_000;
    const n = maxAffordable(def, 0, money);
    expect(costFor(def, 0, n)).toBeLessThanOrEqual(money);
    expect(costFor(def, 0, n + 1)).toBeGreaterThan(money);
  });

  it('maxAffordable is 0 when you cannot even afford a single level', () => {
    expect(maxAffordable(def, 0, 0)).toBe(0);
  });

  it('a higher current level costs more for the next level (geometric growth)', () => {
    expect(costFor(def, 50, 1)).toBeGreaterThan(costFor(def, 0, 1));
  });
});

describe('incomePerSec', () => {
  it('ignores stations without a manager by default (onlyManaged=true)', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: false, progress: 0, running: false } } });
    expect(incomePerSec(s)).toBe(0);
  });

  it('counts a manager-run station', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } } });
    expect(incomePerSec(s)).toBeGreaterThan(0);
  });

  it('a station out of stock (management unlocked) contributes nothing even with a manager', () => {
    const s = makeState({
      managementUnlocked: true,
      stock: { maki: 0 },
      stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } },
    });
    expect(incomePerSec(s)).toBe(0);
  });
});

describe('offlineCapMs', () => {
  it('is the base cap plus 1h per Night Shift perk level', () => {
    const base = makeState();
    const perked = makeState({ perks: { offline: 3 } });
    expect(offlineCapMs(perked)).toBe(offlineCapMs(base) + 3 * 3_600_000);
  });

  it('VIP gets the flat 24h cap regardless of perks', () => {
    const s = makeState({ vip: true, perks: { offline: 6 } });
    expect(offlineCapMs(s)).toBe(24 * 60 * 60 * 1000);
  });
});

describe('offlineEarnings', () => {
  it('returns null for a very short absence (under a minute) even with a manager running', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } } });
    expect(offlineEarnings(s, 30_000)).toBeNull();
  });

  it('returns null when nothing is manager-run (nothing could have earned anything)', () => {
    const s = makeState();
    expect(offlineEarnings(s, 3_600_000)).toBeNull();
  });

  it('earns money proportional to elapsed time for a manager-run station with no stock limit', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } } });
    const oneHour = offlineEarnings(s, 3_600_000);
    const twoHours = offlineEarnings(s, 7_200_000);
    expect(oneHour).not.toBeNull();
    expect(twoHours!.earned).toBeCloseTo(oneHour!.earned * 2, 2);
  });

  it('caps the counted time at offlineCapMs, even if you were away much longer', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } } });
    const cap = offlineCapMs(s);
    const withinCap = offlineEarnings(s, cap);
    const wayOver = offlineEarnings(s, cap * 10);
    expect(wayOver!.earned).toBeCloseTo(withinCap!.earned, 2);
    expect(wayOver!.ms).toBe(cap);
  });

  it('sets ranDry and stops earning once ingredient stock runs out mid-absence', () => {
    const s = makeState({
      managementUnlocked: true,
      stock: { maki: 5 }, // only 5 servings available
      stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } },
    });
    const report = offlineEarnings(s, 3_600_000)!; // an hour is plenty to exhaust 5 servings
    expect(report.ranDry).toBe(true);
    expect(report.consumed.maki).toBeCloseTo(5, 5);
  });

  it('does not set ranDry when stock comfortably outlasts the absence', () => {
    const s = makeState({
      managementUnlocked: true,
      stock: { maki: 1_000_000 },
      stations: { ...makeState().stations, maki: { level: 10, manager: true, progress: 0, running: true } },
    });
    const report = offlineEarnings(s, 3_600_000)!;
    expect(report.ranDry).toBe(false);
  });
});

describe('abilityCooldown', () => {
  it('reduces the base cooldown by 10% per Quick Hands perk level', () => {
    const s = makeState({ perks: { quick_hands: 2 } });
    expect(abilityCooldown(s, 100_000)).toBeCloseTo(80_000, 5);
  });

  it('is unchanged with no perk levels', () => {
    const s = makeState();
    expect(abilityCooldown(s, 100_000)).toBe(100_000);
  });
});
