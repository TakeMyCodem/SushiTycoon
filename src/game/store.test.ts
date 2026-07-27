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
  it('gems_small grants exactly 100 gems', () => {
    const before = useGame.getState().s.gems;
    useGame.getState().grantIap('gems_small');
    expect(useGame.getState().s.gems).toBe(before + 100);
  });

  it('gems_large grants exactly 1200 gems', () => {
    const before = useGame.getState().s.gems;
    useGame.getState().grantIap('gems_large');
    expect(useGame.getState().s.gems).toBe(before + 1200);
  });

  it('noads only sets the noAds flag, nothing else', () => {
    const before = useGame.getState().s;
    useGame.getState().grantIap('noads');
    const after = useGame.getState().s;
    expect(after.noAds).toBe(true);
    expect(after.vip).toBe(before.vip);
    expect(after.gems).toBe(before.gems);
  });

  it('vip sets vip + noAds and grants 500 gems', () => {
    const before = useGame.getState().s.gems;
    useGame.getState().grantIap('vip');
    const s = useGame.getState().s;
    expect(s.vip).toBe(true);
    expect(s.noAds).toBe(true);
    expect(s.gems).toBe(before + 500);
  });

  it('starter grants gems, sets noAds, and (like whale) needs active income for its instant-cash portion', () => {
    const before = useGame.getState().s.gems;
    useGame.getState().grantIap('starter');
    const s = useGame.getState().s;
    expect(s.gems).toBe(before + 250);
    expect(s.noAds).toBe(true);
    expect(s.money).toBe(0); // no manager running yet -> incomePerSec is 0
  });

  it('an unrecognized sku silently grants nothing (no crash, no partial state change)', () => {
    const before = useGame.getState().s;
    useGame.getState().grantIap('not_a_real_sku');
    const after = useGame.getState().s;
    expect(after.gems).toBe(before.gems);
    expect(after.money).toBe(before.money);
  });

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

describe('buyUpgrade', () => {
  it('refuses when money is insufficient, and refuses to buy the same upgrade twice', () => {
    useGame.getState().buyUpgrade('g0'); // costs 2e5, player has 0
    expect(useGame.getState().s.upgrades).not.toContain('g0');

    useGame.setState((p) => ({ s: { ...p.s, money: 1e6 } }));
    useGame.getState().buyUpgrade('g0');
    expect(useGame.getState().s.upgrades).toContain('g0');
    const moneyAfterFirst = useGame.getState().s.money;

    useGame.getState().buyUpgrade('g0'); // already owned
    expect(useGame.getState().s.money).toBe(moneyAfterFirst); // no double charge
    expect(useGame.getState().s.upgrades.filter((id) => id === 'g0')).toHaveLength(1);
  });
});

describe('useAbility', () => {
  it('does nothing if the station has no manager yet (ability locked)', () => {
    useGame.getState().useAbility('yuki_hands'); // maki has no manager in freshState
    expect(useGame.getState().s.stats.abilitiesUsed).toBe(0);
  });

  it('activates once the station has a manager, and enters cooldown', () => {
    useGame.setState((p) => ({ s: { ...p.s, stations: { ...p.s.stations, maki: { level: 10, manager: true, progress: 0, running: true } } } }));
    useGame.getState().useAbility('yuki_hands');
    const s = useGame.getState().s;
    expect(s.stats.abilitiesUsed).toBe(1);
    expect(s.abilityReady.yuki_hands).toBeGreaterThan(Date.now());
    expect(s.effects.some((e) => e.source === 'yuki_hands')).toBe(true);
  });

  it('a second use during cooldown is a no-op', () => {
    useGame.setState((p) => ({ s: { ...p.s, stations: { ...p.s.stations, maki: { level: 10, manager: true, progress: 0, running: true } } } }));
    useGame.getState().useAbility('yuki_hands');
    useGame.getState().useAbility('yuki_hands');
    expect(useGame.getState().s.stats.abilitiesUsed).toBe(1);
  });
});

describe('catchVip', () => {
  it('does nothing when there is no active VIP event', () => {
    useGame.getState().catchVip();
    expect(useGame.getState().s.stats.vipCaught).toBe(0);
  });

  it('awards money and raises reputation (capped at 100) when a VIP is caught', () => {
    useGame.setState((p) => ({
      s: {
        ...p.s,
        reputation: 99.7,
        event: { kind: 'vip', until: Date.now() + 5000, rewardSeconds: 100 },
        stations: { ...p.s.stations, maki: { level: 10, manager: true, progress: 0, running: true } },
      },
    }));
    useGame.getState().catchVip();
    const s = useGame.getState().s;
    expect(s.stats.vipCaught).toBe(1);
    expect(s.event).toBeNull();
    expect(s.reputation).toBe(100); // capped, not 100.3
  });

  it('does nothing for an already-expired VIP event', () => {
    useGame.setState((p) => ({ s: { ...p.s, event: { kind: 'vip', until: Date.now() - 1000, rewardSeconds: 100 } } }));
    useGame.getState().catchVip();
    expect(useGame.getState().s.stats.vipCaught).toBe(0);
  });
});

describe('buyPerk', () => {
  it('refuses without enough stars, and buying raises the level while deducting the exact cost', () => {
    useGame.getState().buyPerk('golden_touch'); // costs stars, player has 0
    expect(useGame.getState().s.perks.golden_touch).toBeUndefined();

    useGame.setState((p) => ({ s: { ...p.s, stars: 1000 } }));
    useGame.getState().buyPerk('golden_touch');
    const s = useGame.getState().s;
    expect(s.perks.golden_touch).toBe(1);
    expect(s.starsSpent).toBeGreaterThan(0);
    expect(s.stars).toBe(1000 - s.starsSpent);
  });

  it('a spent star is gone from the free pool for good (the whole point of the perk trade-off)', () => {
    useGame.setState((p) => ({ s: { ...p.s, stars: 1000 } }));
    const before = useGame.getState().s.stars;
    useGame.getState().buyPerk('golden_touch');
    expect(useGame.getState().s.stars).toBeLessThan(before);
  });
});

describe('claimOffline', () => {
  it('is a no-op when there is no pending offline report', () => {
    const before = useGame.getState().s.money;
    useGame.getState().claimOffline(false);
    expect(useGame.getState().s.money).toBe(before);
  });

  it('adds the (undoubled) earned amount and deducts consumed stock', () => {
    useGame.setState((p) => ({
      s: { ...p.s, stock: { maki: 50 } },
      offline: { ms: 3_600_000, earned: 1000, consumed: { maki: 20 }, ranDry: false },
    }));
    useGame.getState().claimOffline(false);
    const s = useGame.getState().s;
    expect(s.money).toBe(1000);
    expect(s.stock.maki).toBe(30);
    expect(useGame.getState().offline).toBeNull();
  });

  it('doubles the reward when doubled=true, and counts an ad watched', () => {
    useGame.setState({ offline: { ms: 3_600_000, earned: 500, consumed: {}, ranDry: false } });
    useGame.getState().claimOffline(true);
    const s = useGame.getState().s;
    expect(s.money).toBe(1000);
    expect(s.stats.adsWatched).toBe(1);
  });

  it('never lets consumed stock go negative', () => {
    useGame.setState((p) => ({
      s: { ...p.s, stock: { maki: 5 } },
      offline: { ms: 3_600_000, earned: 100, consumed: { maki: 20 }, ranDry: true },
    }));
    useGame.getState().claimOffline(false);
    expect(useGame.getState().s.stock.maki).toBe(0);
  });
});

describe('chef fragments / roster', () => {
  it('grantFragments adds fragments to a chef the player may not own yet', () => {
    useGame.getState().grantFragments('yuki', 5);
    expect(useGame.getState().s.chefs.yuki.fragments).toBe(5);
    expect(useGame.getState().s.chefs.yuki.level).toBe(0);
  });

  it('grantFragments ignores a non-positive amount', () => {
    useGame.getState().grantFragments('yuki', 0);
    expect(useGame.getState().s.chefs.yuki).toBeUndefined();
  });

  it('upgradeChef refuses without enough fragments', () => {
    useGame.getState().grantFragments('yuki', 1); // yuki (common) needs 8 for level 1
    useGame.getState().upgradeChef('yuki');
    expect(useGame.getState().s.chefs.yuki.level).toBe(0);
  });

  it('upgradeChef hires the chef at level 1 and auto-assigns them to an open roster spot', () => {
    useGame.getState().grantFragments('yuki', 8);
    useGame.getState().upgradeChef('yuki');
    const s = useGame.getState().s;
    expect(s.chefs.yuki.level).toBe(1);
    expect(s.chefs.yuki.fragments).toBe(0); // fully spent
    expect(s.roster).toContain('yuki');
  });

  it('upgradeChef does NOT auto-assign a second hire once the roster is full', () => {
    useGame.setState((p) => ({ s: { ...p.s, roster: ['hiro', 'aiko'], slots: 2, chefs: { hiro: { fragments: 0, level: 1 }, aiko: { fragments: 0, level: 1 } } } }));
    useGame.getState().grantFragments('yuki', 8);
    useGame.getState().upgradeChef('yuki');
    expect(useGame.getState().s.chefs.yuki.level).toBe(1); // still gets hired...
    expect(useGame.getState().s.roster).not.toContain('yuki'); // ...just benched
  });

  it('toggleChef refuses for a chef that is not owned (level 0)', () => {
    useGame.getState().toggleChef('yuki');
    expect(useGame.getState().s.roster).not.toContain('yuki');
  });

  it('toggleChef benches an assigned chef, and assigns a benched one if there is room', () => {
    useGame.setState((p) => ({ s: { ...p.s, chefs: { yuki: { fragments: 0, level: 1 } }, roster: ['yuki'] } }));
    useGame.getState().toggleChef('yuki');
    expect(useGame.getState().s.roster).not.toContain('yuki');
    useGame.getState().toggleChef('yuki');
    expect(useGame.getState().s.roster).toContain('yuki');
  });

  it('toggleChef refuses to assign beyond the available slots', () => {
    useGame.setState((p) => ({
      s: { ...p.s, slots: 1, roster: ['hiro'], chefs: { hiro: { fragments: 0, level: 1 }, yuki: { fragments: 0, level: 1 } } },
    }));
    useGame.getState().toggleChef('yuki');
    expect(useGame.getState().s.roster).toEqual(['hiro']);
  });

  it('buyFragments deducts gems at the rarity-based fixed price, with no RNG', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 100 } }));
    useGame.getState().buyFragments('yuki', 5); // common: 4 gems each = 20
    const s = useGame.getState().s;
    expect(s.gems).toBe(80);
    expect(s.chefs.yuki.fragments).toBe(5);
  });

  it('buyFragments refuses without enough gems, and spends nothing', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 1 } }));
    useGame.getState().buyFragments('yuki', 5);
    expect(useGame.getState().s.gems).toBe(1);
    expect(useGame.getState().s.chefs.yuki).toBeUndefined();
  });

  it('buySlot raises the slot count and deducts the exact listed cost', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 1000 } }));
    const before = useGame.getState().s.slots;
    useGame.getState().buySlot();
    const s = useGame.getState().s;
    expect(s.slots).toBe(before + 1);
    expect(s.gems).toBeLessThan(1000);
  });

  it('buySlot refuses once MAX_SLOTS is reached', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 100000, slots: 5 } }));
    useGame.getState().buySlot();
    expect(useGame.getState().s.slots).toBe(5);
  });
});

describe('buyStock / buyContract', () => {
  it('buyStock refuses without enough money and adds nothing to stock', () => {
    useGame.getState().buyStock('maki', 6);
    expect(useGame.getState().s.stock.maki ?? 0).toBe(0);
  });

  it('buyStock deducts money and adds servings once affordable', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 1e9, managementUnlocked: true } }));
    useGame.getState().buyStock('maki', 6);
    const s = useGame.getState().s;
    expect(s.money).toBeLessThan(1e9);
    expect(s.stock.maki).toBeGreaterThan(0);
  });

  it('buyContract refuses to sign the same station twice', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 1e12, contracts: ['maki'] } }));
    const before = useGame.getState().s.money;
    useGame.getState().buyContract('maki');
    expect(useGame.getState().s.money).toBe(before); // untouched, refused early
    expect(useGame.getState().s.contracts).toEqual(['maki']); // not duplicated
  });

  it('buyContract signs a new station and deducts money', () => {
    useGame.setState((p) => ({ s: { ...p.s, money: 1e12 } }));
    useGame.getState().buyContract('maki');
    const s = useGame.getState().s;
    expect(s.contracts).toContain('maki');
    expect(s.money).toBeLessThan(1e12);
  });
});

describe('shift cooldown', () => {
  it('startShiftCooldown sets a future readiness time', () => {
    useGame.getState().startShiftCooldown();
    expect(useGame.getState().s.shiftReadyAt).toBeGreaterThan(Date.now());
  });

  it('clearShiftCooldown resets readiness to now and counts an ad watched', () => {
    useGame.getState().startShiftCooldown();
    useGame.getState().clearShiftCooldown();
    const s = useGame.getState().s;
    expect(s.shiftReadyAt).toBe(0);
    expect(s.stats.adsWatched).toBe(1);
  });

  it('skipShiftCooldown refuses without enough gems', () => {
    useGame.getState().startShiftCooldown();
    useGame.getState().skipShiftCooldown();
    expect(useGame.getState().s.shiftReadyAt).toBeGreaterThan(0); // untouched
  });

  it('skipShiftCooldown spends gems and clears the cooldown once affordable', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 1000 } }));
    useGame.getState().startShiftCooldown();
    useGame.getState().skipShiftCooldown();
    const s = useGame.getState().s;
    expect(s.shiftReadyAt).toBe(0);
    expect(s.gems).toBeLessThan(1000);
  });
});

describe('spendGems', () => {
  it('refuses without enough gems', () => {
    useGame.getState().spendGems('cash');
    expect(useGame.getState().s.money).toBe(0);
  });

  it('"cash" needs active income to produce money — zero income means zero gain even if the gem spend succeeds', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 1000 } })); // no manager running -> incomePerSec = 0
    useGame.getState().spendGems('cash');
    const s = useGame.getState().s;
    expect(s.gems).toBeLessThan(1000); // gems were still spent
    expect(s.money).toBe(0);
  });

  it('"boost" grants a temporary income-multiplier effect', () => {
    useGame.setState((p) => ({ s: { ...p.s, gems: 1000 } }));
    useGame.getState().spendGems('boost');
    const s = useGame.getState().s;
    expect(s.effects.some((e) => e.source === 'gem_boost' && e.kind === 'income')).toBe(true);
  });
});

describe('watchAdBoost', () => {
  it('adds an income boost effect and counts an ad watched', () => {
    useGame.getState().watchAdBoost();
    const s = useGame.getState().s;
    expect(s.effects.some((e) => e.source === 'ad_boost')).toBe(true);
    expect(s.stats.adsWatched).toBe(1);
  });
});

describe('claimDaily', () => {
  it('grants gems and chef fragments, and is a no-op if already claimed today', () => {
    useGame.getState().claimDaily();
    const s1 = useGame.getState().s;
    expect(s1.gems).toBeGreaterThan(0);
    expect(s1.dailyStreak).toBe(1);

    useGame.getState().claimDaily(); // same day again
    expect(useGame.getState().s.gems).toBe(s1.gems); // unchanged
    expect(useGame.getState().s.dailyStreak).toBe(1);
  });

  it('continues the streak if the last claim was yesterday, and resets it otherwise', () => {
    const yesterday = Date.now() - 25 * 3600 * 1000;
    useGame.setState((p) => ({ s: { ...p.s, lastDaily: yesterday, dailyStreak: 4 } }));
    useGame.getState().claimDaily();
    expect(useGame.getState().s.dailyStreak).toBe(5);
  });

  it('resets the streak to 1 after a gap of more than a day', () => {
    const longAgo = Date.now() - 5 * 86400_000;
    useGame.setState((p) => ({ s: { ...p.s, lastDaily: longAgo, dailyStreak: 20 } }));
    useGame.getState().claimDaily();
    expect(useGame.getState().s.dailyStreak).toBe(1);
  });
});

/**
 * checkProgress() (management unlock, free manager, quests, achievements,
 * league week resolution, michelin banners) is module-private — only
 * reachable through tick(), which accumulates elapsed time in a
 * module-level `checkAcc` and runs it every CHECK_INTERVAL_MS (400ms).
 * A single `tick(400)` is enough to trigger it in one call.
 */
describe('tick -> checkProgress', () => {
  it('unlocks the management layer once 3 dishes are open, granting starting stock', () => {
    useGame.setState((p) => ({
      s: {
        ...p.s,
        stations: {
          ...p.s.stations,
          maki: { level: 1, manager: false, progress: 0, running: false },
          nigiri: { level: 1, manager: false, progress: 0, running: false },
          sashimi: { level: 1, manager: false, progress: 0, running: false },
        },
      },
    }));
    useGame.getState().tick(400);
    const s = useGame.getState().s;
    expect(s.managementUnlocked).toBe(true);
    expect(s.stock.maki).toBeGreaterThan(0);
  });

  it('grants a free manager for the first station once it reaches level 10', () => {
    useGame.setState((p) => ({ s: { ...p.s, stations: { ...p.s.stations, maki: { level: 10, manager: false, progress: 0, running: false } } } }));
    useGame.getState().tick(400);
    const s = useGame.getState().s;
    expect(s.stations.maki.manager).toBe(true);
    expect(s.stats.managersHired).toBe(1);
  });

  it('completes a quest once its target is met, grants the reward, and queues the next quest', () => {
    useGame.setState((p) => ({
      s: { ...p.s, activeQuests: ['q1', 'q2', 'q3'], stations: { ...p.s.stations, maki: { level: 25, manager: false, progress: 0, running: false } } },
    }));
    useGame.getState().tick(400);
    const s = useGame.getState().s;
    expect(s.doneQuests).toContain('q1');
    expect(s.activeQuests).not.toContain('q1');
    expect(s.activeQuests).toHaveLength(3); // q4 queued in to replace q1
    expect(s.gems).toBeGreaterThan(0); // q1's reward is gems
  });

  it('unlocks an achievement once its condition is met, for a permanent income bonus', () => {
    useGame.setState((p) => ({ s: { ...p.s, stats: { ...p.s.stats, taps: 100 } } }));
    useGame.getState().tick(400);
    expect(useGame.getState().s.achievements).toContain('a_tap100');
  });

  it('resolves the league week once it has rolled over, resetting points and possibly changing division', () => {
    const staleWeek = useGame.getState().s.league.weekNumber - 1;
    useGame.setState((p) => ({ s: { ...p.s, league: { weekNumber: staleWeek, division: 0, points: 50 } } }));
    useGame.getState().tick(400);
    const s = useGame.getState().s;
    expect(s.league.weekNumber).toBeGreaterThan(staleWeek);
    expect(s.league.points).toBe(0); // fresh week
    expect(s.lastLeagueOutcome).not.toBeNull();
  });

  it('does NOT resolve the league week if it has not rolled over yet', () => {
    useGame.setState((p) => ({ s: { ...p.s, league: { ...p.s.league, points: 50 } } }));
    useGame.getState().tick(400);
    expect(useGame.getState().s.league.points).toBe(50); // untouched
    expect(useGame.getState().s.lastLeagueOutcome).toBeNull();
  });

  it('marks a Michelin rank as seen once both its thresholds are crossed', () => {
    useGame.setState((p) => ({ s: { ...p.s, stars: 100, starsSpent: 0, stats: { ...p.s.stats, prestiges: 3 }, michelinRankSeen: 0 } }));
    useGame.getState().tick(400);
    expect(useGame.getState().s.michelinRankSeen).toBe(1);
  });

  it('does not re-flag a Michelin rank that was already seen', () => {
    useGame.setState((p) => ({ s: { ...p.s, stars: 100, starsSpent: 0, stats: { ...p.s.stats, prestiges: 3 }, michelinRankSeen: 1 } }));
    useGame.getState().tick(400);
    expect(useGame.getState().s.michelinRankSeen).toBe(1); // unchanged, no re-trigger
  });
});
