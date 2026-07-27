import { describe, expect, it } from 'vitest';
import { PERKS, PERK_BY_ID, perkLevel, perkNextCost } from './perks';

describe('PERKS data integrity', () => {
  it('has no duplicate ids', () => {
    const ids = PERKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('PERK_BY_ID indexes every perk', () => {
    for (const p of PERKS) expect(PERK_BY_ID[p.id]).toBe(p);
  });

  it('cost is positive and non-decreasing across every level for every perk', () => {
    for (const p of PERKS) {
      let prev = 0;
      for (let lvl = 0; lvl < p.maxLevel; lvl++) {
        const cost = p.cost(lvl);
        expect(cost, `${p.id} level ${lvl}`).toBeGreaterThan(0);
        expect(cost, `${p.id} level ${lvl} should cost at least as much as the previous level`).toBeGreaterThanOrEqual(prev);
        prev = cost;
      }
    }
  });

  it('desc() produces a non-empty string at every level, including level 0 (the "if you bought level 1" preview)', () => {
    for (const p of PERKS) {
      for (let lvl = 0; lvl <= p.maxLevel; lvl++) {
        expect(p.desc(lvl).length, `${p.id} level ${lvl}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('perkLevel', () => {
  it('is 0 for a perk not present in the perks map', () => {
    expect(perkLevel({}, 'golden_touch')).toBe(0);
  });

  it('reads the stored level directly', () => {
    expect(perkLevel({ golden_touch: 4 }, 'golden_touch')).toBe(4);
  });
});

describe('perkNextCost', () => {
  it('returns the cost for level 0 -> 1 when not yet owned', () => {
    const def = PERK_BY_ID.golden_touch;
    expect(perkNextCost({}, def)).toBe(Math.ceil(def.cost(0)));
  });

  it('returns null once maxLevel is reached', () => {
    const def = PERK_BY_ID.golden_touch;
    expect(perkNextCost({ golden_touch: def.maxLevel }, def)).toBeNull();
  });

  it('returns the cost for the next level when partially leveled', () => {
    const def = PERK_BY_ID.manager_deal;
    expect(perkNextCost({ manager_deal: 2 }, def)).toBe(Math.ceil(def.cost(2)));
  });
});
