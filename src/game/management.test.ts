import { describe, expect, it } from 'vitest';
import {
  PRICE_TIERS, bestTierFor, bulkDiscount, contractCost, demandFor, hasStock, marketFactor,
  netRate, priceTolerance, servingsForHours, servingsLeft, stockDurationMs,
} from './management';
import { makeState } from './test-helpers';

describe('priceTolerance / demandFor / netRate', () => {
  it('tolerance ranges from 0.6 at 0 reputation to 2.2 at 100', () => {
    expect(priceTolerance(0)).toBeCloseTo(0.6, 5);
    expect(priceTolerance(100)).toBeCloseTo(2.2, 5);
    expect(priceTolerance(50)).toBeCloseTo(1.4, 5);
  });

  it('clamps reputation outside 0-100', () => {
    expect(priceTolerance(-50)).toBe(priceTolerance(0));
    expect(priceTolerance(500)).toBe(priceTolerance(100));
  });

  it('demand is clamped between 0.15 and 1.5 even at extreme prices', () => {
    expect(demandFor(0.01, 100)).toBeLessThanOrEqual(1.5);
    expect(demandFor(100, 0)).toBeGreaterThanOrEqual(0.15);
  });

  it('higher price means lower demand at fixed reputation (the whole point of the system)', () => {
    expect(demandFor(0.7, 50)).toBeGreaterThan(demandFor(2.2, 50));
  });

  it('netRate is just price * demand', () => {
    expect(netRate(1.3, 50)).toBeCloseTo(1.3 * demandFor(1.3, 50), 10);
  });
});

describe('bestTierFor — regression-locks the documented optimum table (docs/BALANSZ.md)', () => {
  it('at 0 reputation, Friendly (id 1) is optimal', () => {
    expect(bestTierFor(0)).toBe(1);
  });

  it('at 60 reputation, City Average (id 2) is optimal', () => {
    expect(bestTierFor(60)).toBe(2);
  });

  it('at 100 reputation, Premium (id 3) is optimal', () => {
    expect(bestTierFor(100)).toBe(3);
  });

  it('the optimal tier is monotonically non-decreasing as reputation rises', () => {
    // This is the property the whole "moving optimum" design depends on —
    // if PRICE_ELASTICITY is ever tuned wrong, a higher reputation could
    // stop mattering (see the warning comment in management.ts).
    let lastBest = 0;
    for (let rep = 0; rep <= 100; rep += 5) {
      const best = bestTierFor(rep);
      expect(best).toBeGreaterThanOrEqual(lastBest);
      lastBest = best;
    }
  });

  it('only the middle three tiers are ever optimal across the full 0-100 reputation range', () => {
    const reached = new Set<number>();
    for (let rep = 0; rep <= 100; rep += 1) reached.add(bestTierFor(rep));
    // Cafeteria (id 0) is always dominated by Friendly, and Luxury (id 4)
    // would need reputation > 100 (p* maxes at 1.81 with elasticity 0.7) —
    // both documented in BALANSZ.md's table, which never recommends either.
    // This locks in that known shape; if it ever changes, PRICE_ELASTICITY
    // or the tier prices moved and the BALANSZ.md table needs re-measuring.
    expect(reached).toEqual(new Set([1, 2, 3]));
    expect(reached.size).toBe(PRICE_TIERS.length - 2);
  });
});

describe('marketFactor', () => {
  it('is deterministic for the same day and station', () => {
    expect(marketFactor('maki', 42)).toBe(marketFactor('maki', 42));
  });

  it('stays within the documented 0.7-1.3 range', () => {
    for (let day = 0; day < 50; day++) {
      const f = marketFactor('maki', day);
      expect(f).toBeGreaterThanOrEqual(0.7);
      expect(f).toBeLessThanOrEqual(1.3);
    }
  });

  it('differs by station on the same day (each dish has its own market)', () => {
    // Not a hard guarantee for every possible day (a hash can coincide),
    // but across many days at least one should differ.
    const differs = Array.from({ length: 10 }, (_, day) => marketFactor('maki', day) !== marketFactor('nigiri', day));
    expect(differs.some(Boolean)).toBe(true);
  });
});

describe('bulkDiscount', () => {
  it('no discount below 6 hours', () => {
    expect(bulkDiscount(1)).toBe(1);
  });

  it('10% off at 6+ hours', () => {
    expect(bulkDiscount(6)).toBe(0.9);
  });

  it('20% off at 24+ hours', () => {
    expect(bulkDiscount(24)).toBe(0.8);
  });
});

describe('servingsForHours / stockDurationMs / hasStock / servingsLeft', () => {
  it('a locked (level 0) station needs/holds zero servings', () => {
    const s = makeState();
    expect(servingsForHours(s, 'nigiri', 24)).toBe(0);
  });

  it('stockDurationMs is Infinity for a station without a manager (nothing draining the stock)', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 5, manager: false, progress: 0, running: false } }, stock: { maki: 100 } });
    expect(stockDurationMs(s, 'maki')).toBe(Infinity);
  });

  it('stockDurationMs is finite and positive once a manager is running the station', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 5, manager: true, progress: 0, running: true } }, stock: { maki: 100 } });
    expect(stockDurationMs(s, 'maki')).toBeGreaterThan(0);
    expect(stockDurationMs(s, 'maki')).toBeLessThan(Infinity);
  });

  it('hasStock is always true before management unlocks, regardless of actual stock', () => {
    const s = makeState({ managementUnlocked: false, stock: { maki: 0 } });
    expect(hasStock(s, 'maki')).toBe(true);
  });

  it('hasStock reflects actual stock once management is unlocked', () => {
    const withStock = makeState({ managementUnlocked: true, stock: { maki: 5 } });
    const empty = makeState({ managementUnlocked: true, stock: { maki: 0 } });
    expect(hasStock(withStock, 'maki')).toBe(true);
    expect(hasStock(empty, 'maki')).toBe(false);
  });

  it('servingsLeft is Infinity before management unlocks (never blocks production)', () => {
    const s = makeState({ managementUnlocked: false });
    expect(servingsLeft(s, 'maki')).toBe(Infinity);
  });
});

describe('contractCost', () => {
  it('a higher-level station costs more to put under contract than a fresh one', () => {
    const low = makeState({ stations: { ...makeState().stations, maki: { level: 1, manager: false, progress: 0, running: false } } });
    const high = makeState({ stations: { ...makeState().stations, maki: { level: 50, manager: false, progress: 0, running: false } } });
    expect(contractCost(high, 'maki')).toBeGreaterThan(contractCost(low, 'maki'));
  });

  it('is zero-cost-safe (never negative or NaN) for a locked station', () => {
    const s = makeState();
    expect(contractCost(s, 'nigiri')).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(contractCost(s, 'nigiri'))).toBe(false);
  });
});
