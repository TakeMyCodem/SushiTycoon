import { describe, expect, it } from 'vitest';
import { fmt, milestoneMult, cycleIncome, starsFor } from './math';
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
