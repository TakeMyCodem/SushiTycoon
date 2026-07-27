import { describe, expect, it } from 'vitest';
import { chefBonus, comboBonus, synergyBonus, effectValue, CHEF_BY_ID, SYNERGY_PCT, COMBO_BONUS_PCT } from './chefs';
import { makeState } from './test-helpers';

/** Yuki: income, target 'maki', school 'hagyomany', comboDish 'maki'. */
const yuki = CHEF_BY_ID.yuki;
/** Kenji: income, target 'all' (global), school 'hagyomany'. */
const kenji = CHEF_BY_ID.kenji;

function withRoster(chefIds: string[]) {
  const chefs: Record<string, { fragments: number; level: number }> = {};
  for (const id of chefIds) chefs[id] = { fragments: 0, level: 1 };
  return makeState({ chefs, roster: chefIds });
}

describe('chefBonus scoping', () => {
  it('a station-targeted chef only counts in "station" scope for its own station', () => {
    const s = withRoster(['yuki']);
    expect(chefBonus(s, 'income', 'station', 'maki')).toBeCloseTo(effectValue(yuki, 1));
    expect(chefBonus(s, 'income', 'station', 'nigiri')).toBe(0);
    // A station-targeted effect must NOT leak into the 'global' scope —
    // this is the exact bug the module's own doc comment warns about:
    // double-counting would happen if a station chef counted as global too.
    expect(chefBonus(s, 'income', 'global', 'maki')).toBe(0);
  });

  it('a global (target: all) chef only counts in "global" scope, not "station"', () => {
    const s = withRoster(['kenji']);
    expect(chefBonus(s, 'income', 'global')).toBeCloseTo(effectValue(kenji, 1));
    expect(chefBonus(s, 'income', 'station', 'maki')).toBe(0);
    expect(chefBonus(s, 'income', 'station', 'nigiri')).toBe(0);
  });

  it('"both" scope sums a matching station chef and a matching global chef without conflict', () => {
    const s = withRoster(['yuki', 'kenji']);
    const total = chefBonus(s, 'income', 'both', 'maki');
    expect(total).toBeCloseTo(effectValue(yuki, 1) + effectValue(kenji, 1));
  });

  it('chefs not in the active roster contribute nothing, even if owned', () => {
    const s = makeState({ chefs: { yuki: { fragments: 0, level: 3 } }, roster: [] });
    expect(chefBonus(s, 'income', 'station', 'maki')).toBe(0);
  });

  it('a chef with level 0 (fragments only, not hired) contributes nothing even if benched into the roster array', () => {
    const s = makeState({ chefs: { yuki: { fragments: 5, level: 0 } }, roster: ['yuki'] });
    expect(chefBonus(s, 'income', 'station', 'maki')).toBe(0);
  });

  it('ignores chefs whose effect kind does not match the query', () => {
    const s = withRoster(['yuki']); // yuki is 'income', not 'speed'
    expect(chefBonus(s, 'speed', 'both', 'maki')).toBe(0);
  });
});

describe('synergyBonus', () => {
  it('is zero with fewer than 2 chefs from the same school', () => {
    // yuki + kenji are both 'hagyomany', hiro too — 1 chef alone gives nothing
    expect(synergyBonus(withRoster(['yuki']))).toBe(0);
  });

  it('gives one bonus for the first pair from a school', () => {
    expect(synergyBonus(withRoster(['yuki', 'hiro']))).toBe(SYNERGY_PCT);
  });

  it('does not award a second bonus until a second full pair forms (3 of a school = still 1 pair)', () => {
    expect(synergyBonus(withRoster(['yuki', 'hiro', 'kenji']))).toBe(SYNERGY_PCT);
  });
});

describe('comboBonus', () => {
  it('is zero when no roster chef has that dish as their combo', () => {
    const s = withRoster(['yuki']); // combo = maki
    expect(comboBonus(s, 'nigiri')).toBe(0);
  });

  it('gives COMBO_BONUS_PCT when a roster chef combos on that dish', () => {
    const s = withRoster(['yuki']); // combo = maki
    expect(comboBonus(s, 'maki')).toBe(COMBO_BONUS_PCT);
  });

  it('stacks when two roster chefs share the same combo dish (e.g. sashimi: Aiko + Takeshi)', () => {
    const s = withRoster(['aiko', 'takeshi']);
    expect(comboBonus(s, 'sashimi')).toBe(COMBO_BONUS_PCT * 2);
  });

  it('is independent of chefBonus — a combo applies even for chefs whose base effect targets something else', () => {
    // Kenji's base effect is global income, but his combo dish is ramen.
    const s = withRoster(['kenji']);
    expect(comboBonus(s, 'ramen')).toBe(COMBO_BONUS_PCT);
    expect(chefBonus(s, 'income', 'station', 'ramen')).toBe(0);
  });
});
