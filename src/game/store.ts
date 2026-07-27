import { create } from 'zustand';
import {
  AD_BOOST_MS, AD_BOOST_MULT, EVENT_MAX_MS, EVENT_MIN_MS, MIN_PRESTIGE_STARS, RUSH_CHANCE,
  RUSH_MS, SAVE_KEY, STATIONS, STATION_BY_ID, VIP_REWARD_SECONDS, VIP_WAIT_MS,
} from './config';
import type { Effect, GameState, OfflineReport, StationState } from './types';
import * as math from './math';
import {
  abilityCooldown, costFor, cycleIncome, cycleMs, incomePerSec, managerCost, maxAffordable,
  offlineEarnings, starsFor,
} from './math';
import { ABILITY_BY_STATION, type AbilityDef } from './abilities';
import { UPGRADE_BY_ID } from './upgrades';
import { PERK_BY_ID, perkLevel, perkNextCost } from './perks';
import { QUESTS, QUEST_BY_ID, initialQuests, nextQuestId } from './quests';
import * as chefs from './chefs';
import {
  BASE_SLOTS, CHEF_BY_ID, FRAGMENT_GEM_COST, MAX_SLOTS, chefOfTheDay, chefState, describeEffect,
  fragmentsForNext, slotCost,
} from './chefs';
import * as management from './management';
import {
  CONTRACT_MARKUP, CONTRACT_REFILL_BELOW_HOURS, CONTRACT_REFILL_TO_HOURS, MANAGEMENT_UNLOCK_STATIONS,
  NEW_STATION_STOCK_HOURS, PRICE_TIERS, REPUTATION_START, STARTING_STOCK_HOURS, contractCost,
  dayNumber, servingsForHours, stockCostForHours, stockDurationMs,
} from './management';
import * as shift from './shift';
import { SHIFT_COOLDOWN_MS, SHIFT_SKIP_GEMS, type ShiftResult } from './shift';
import { ACHIEVEMENTS } from './achievements';
import { track } from './analytics';
import { sfx } from './audio';
import { nextDivision, resolveWeek, weekNumber, DIVISIONS, type WeekOutcome } from './league';
import { michelinRankFor } from './michelin';

export type BuyMode = 1 | 10 | 100 | 'MAX';
export type GemPurchase = 'cash' | 'boost';

/** Gyémánt-nyelők. Enélkül a prémium valuta értéktelen — és nem is vesz senki. */
export const GEM_PRICES: Record<GemPurchase, number> = { cash: 50, boost: 25 };
/** A bevétel-boostok összesen legfeljebb ennyi ideig halmozhatók. */
const BOOST_CAP_MS = 2 * 60 * 60 * 1000;
/** A küldetés- és achievement-ellenőrzés ennyi ms-onként fut, nem minden tickben. */
const CHECK_INTERVAL_MS = 400;

function freshStations(): Record<string, StationState> {
  const stations: Record<string, StationState> = {};
  for (const s of STATIONS) stations[s.id] = { level: 0, manager: false, progress: 0, running: false };
  // Az első állomás ajándékba jár: a játékos 3 másodpercen belül lát bevételt.
  stations[STATIONS[0].id].level = 1;
  return stations;
}

function freshState(): GameState {
  return {
    money: 0, gems: 10, lifetime: 0, runEarnings: 0, stars: 0, starsSpent: 0,
    stations: freshStations(),
    upgrades: [], perks: {}, achievements: [],
    activeQuests: initialQuests(), doneQuests: [],
    abilityReady: {}, effects: [], event: null,
    nextEventAt: Date.now() + EVENT_MIN_MS,
    vip: false, noAds: false,
    lastSeen: Date.now(), createdAt: Date.now(),
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
}

function loadState(): { state: GameState; offline: OfflineReport | null } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: freshState(), offline: null };
    const parsed = JSON.parse(raw) as GameState;
    const fresh = freshState();
    const state: GameState = { ...fresh, ...parsed, stats: { ...fresh.stats, ...parsed.stats } };

    // Mentés-kompatibilitás: a friss alapértékekre húzzuk rá a mentett állapotot,
    // így egy későbbi patch új állomása is működik régi mentéssel.
    state.stations = {};
    for (const s of STATIONS) {
      state.stations[s.id] = Object.assign({}, fresh.stations[s.id], parsed.stations?.[s.id]);
    }
    // Az események és az ideiglenes hatások nem élik túl a kilépést.
    state.effects = [];
    state.event = null;
    state.nextEventAt = Date.now() + EVENT_MIN_MS;

    const away = Math.max(0, Date.now() - (parsed.lastSeen ?? Date.now()));
    return { state, offline: offlineEarnings(state, away) };
  } catch {
    return { state: freshState(), offline: null };
  }
}

export interface Pop {
  id: number;
  stationId: string;
  amount: number;
}

interface Store {
  s: GameState;
  buyMode: BuyMode;
  offline: OfflineReport | null;
  toast: string | null;
  pops: Pop[];
  /** Épp most szerzett achievement/küldetés — külön, feltűnő visszajelzéshez. */
  banner: { title: string; text: string; emoji: string } | null;

  tick: (dtMs: number) => void;
  setBuyMode: (m: BuyMode) => void;
  buy: (stationId: string) => void;
  hireManager: (stationId: string) => void;
  tapStation: (stationId: string) => void;
  buyUpgrade: (id: string) => void;
  useAbility: (id: string) => void;
  catchVip: () => void;
  buyPerk: (id: string) => void;
  claimOffline: (doubled: boolean) => void;
  grantFragments: (chefId: string, amount: number) => void;
  upgradeChef: (chefId: string) => void;
  toggleChef: (chefId: string) => void;
  buyFragments: (chefId: string, amount: number) => void;
  buySlot: () => void;
  setPriceTier: (tier: number) => void;
  buyStock: (stationId: string, hours: number) => void;
  buyContract: (stationId: string) => void;
  /** A műszak végén járó jutalom jóváírása (reklámmal duplázva). */
  awardShift: (result: ShiftResult, doubled: boolean) => void;
  startShiftCooldown: () => void;
  clearShiftCooldown: () => void;
  skipShiftCooldown: () => void;
  spendGems: (kind: GemPurchase) => void;
  watchAdBoost: () => void;
  prestige: () => void;
  claimDaily: () => void;
  grantIap: (sku: string) => void;
  showToast: (msg: string) => void;
  showBanner: (emoji: string, title: string, text: string) => void;
  save: () => void;
  hardReset: () => void;
}

let popId = 0;
let checkAcc = 0;

/** Bannerek sora — egyszerre több trófea/küldetés is teljesülhet. */
type Banner = { emoji: string; title: string; text: string };
const bannerQueue: Banner[] = [];
let bannerTimer: ReturnType<typeof setTimeout> | null = null;
const BANNER_MS = 3200;

function showNextBanner(set: (partial: Partial<Store>) => void) {
  const next = bannerQueue.shift();
  if (!next) {
    bannerTimer = null;
    set({ banner: null });
    return;
  }
  set({ banner: next });
  bannerTimer = setTimeout(() => showNextBanner(set), BANNER_MS);
}

const init = loadState();

/** Hatás hozzáadása/hosszabbítása. Azonos forrás nem duplázódik, hanem tolódik. */
function addEffect(effects: Effect[], e: Effect, cap = BOOST_CAP_MS): Effect[] {
  const now = Date.now();
  const rest = effects.filter((x) => x.source !== e.source && x.until > now);
  const same = effects.find((x) => x.source === e.source && x.until > now);
  const until = Math.min(now + cap, Math.max(now, same?.until ?? 0) + (e.until - now));
  return [...rest, { ...e, until }];
}

export const useGame = create<Store>((set, get) => ({
  s: init.state,
  buyMode: 1,
  offline: init.offline,
  toast: null,
  pops: [],
  banner: null,

  tick: (dt) => {
    const now = Date.now();
    const s = { ...get().s };
    const stations = { ...s.stations };
    const stock = { ...s.stock };
    let stockChanged = false;
    let dryStations = 0;
    let money = s.money;
    let lifetime = s.lifetime;
    let runEarnings = s.runEarnings;
    const newPops: Pop[] = [];

    for (const def of STATIONS) {
      const st = stations[def.id];
      if (!st || st.level === 0) continue;
      if (!st.manager && !st.running) continue;

      // Alapanyaghiány: a pult áll, amíg nincs mit tálalni.
      if (s.managementUnlocked && (stock[def.id] ?? 0) <= 0) {
        stations[def.id] = { ...st, progress: 0, running: false };
        dryStations++;
        continue;
      }

      const dur = cycleMs(s, def, st.level, now);
      let progress = st.progress + dt / dur;
      if (progress >= 1) {
        let cycles = st.manager ? Math.floor(progress) : 1;
        if (s.managementUnlocked) {
          cycles = Math.min(cycles, stock[def.id] ?? 0);
          stock[def.id] = (stock[def.id] ?? 0) - cycles;
          stockChanged = true;
        }
        const gain = cycleIncome(s, def, now) * cycles;
        money += gain;
        lifetime += gain;
        runEarnings += gain;
        if (cycles > 0) newPops.push({ id: popId++, stationId: def.id, amount: gain });
        progress = st.manager ? progress % 1 : 0;
      }
      stations[def.id] = { ...st, progress, running: st.manager ? true : progress > 0 };
    }

    // Beszállítói szerződés: automatikus utánrendelés kényelmi felárral.
    // Aki maga vásárol jó áron, spórol — de aki nem ér rá, annak sem áll le a pult.
    if (s.managementUnlocked && s.contracts.length > 0) {
      for (const id of s.contracts) {
        const withStock: GameState = { ...s, stock };
        if (stockDurationMs(withStock, id) >= CONTRACT_REFILL_BELOW_HOURS * 3_600_000) continue;
        const target = servingsForHours(s, id, CONTRACT_REFILL_TO_HOURS);
        const missingHours = CONTRACT_REFILL_TO_HOURS - stockDurationMs(withStock, id) / 3_600_000;
        const cost = stockCostForHours(s, id, missingHours) * CONTRACT_MARKUP;
        if (money < cost || target <= (stock[id] ?? 0)) continue;
        money -= cost;
        stock[id] = target;
        stockChanged = true;
      }
    }

    // Hírnév: a kifogyott pult rontja, egyébként lassan visszamászik az alapszintre.
    let reputation = s.reputation;
    if (s.managementUnlocked) {
      const sec = dt / 1000;
      if (dryStations > 0) reputation -= 0.06 * sec * dryStations;
      else if (reputation < REPUTATION_START) reputation += 0.02 * sec;
      reputation = Math.max(0, Math.min(100, reputation));
    }

    // Lejárt hatások takarítása (csak ha tényleg járt le valami — felesleges
    // új tömböt gyártani 60 ms-onként).
    const effects = s.effects.some((e) => e.until <= now) ? s.effects.filter((e) => e.until > now) : s.effects;

    // Esemény lejárta / indítása
    let event = s.event;
    let nextEventAt = s.nextEventAt;
    const magnet = perkLevel(s.perks, 'vip_magnet');
    if (event && event.until <= now) {
      event = null;
      nextEventAt = now + EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS) * (1 - magnet * 0.12);
    } else if (!event && now >= nextEventAt) {
      const anyManager = STATIONS.some((d) => stations[d.id].manager);
      if (anyManager) {
        if (Math.random() < RUSH_CHANCE) {
          event = { kind: 'rush', until: now + RUSH_MS };
          s.stats = { ...s.stats, rushesSeen: s.stats.rushesSeen + 1 };
          sfx.rush();
        } else {
          event = {
            kind: 'vip',
            until: now + VIP_WAIT_MS,
            rewardSeconds: VIP_REWARD_SECONDS * (1 + magnet * 0.2),
          };
          sfx.vip();
        }
      } else {
        // Manager nélkül még nincs mit felpörgetni — halasszuk.
        nextEventAt = now + EVENT_MIN_MS;
      }
    }

    const next: GameState = {
      ...s, stations, money, lifetime, runEarnings, effects, event, nextEventAt, reputation,
      stock: stockChanged ? stock : s.stock,
    };
    set((prev) => ({
      s: next,
      pops: newPops.length ? [...prev.pops, ...newPops].slice(-12) : prev.pops,
    }));

    // Küldetés/achievement ellenőrzés ritkítva
    checkAcc += dt;
    if (checkAcc >= CHECK_INTERVAL_MS) {
      checkAcc = 0;
      checkProgress(get, set);
    }
  },

  setBuyMode: (m) => set({ buyMode: m }),

  buy: (stationId) => {
    const { s, buyMode } = get();
    const def = STATION_BY_ID[stationId];
    const st = s.stations[stationId];
    const n = buyMode === 'MAX' ? maxAffordable(def, st.level, s.money) : buyMode;
    if (n <= 0) return;
    const cost = costFor(def, st.level, n);
    if (cost > s.money) return;
    const wasLocked = st.level === 0;
    const stations = { ...s.stations, [stationId]: { ...st, level: st.level + n } };
    // Frissen nyitott fogás kap indulókészletet, különben az első pillanatban
    // alapanyaghiány miatt állna — az rossz élmény lenne egy örömteli pillanatban.
    const stock = wasLocked && s.managementUnlocked
      ? { ...s.stock, [stationId]: servingsForHours({ ...s, stations }, stationId, NEW_STATION_STOCK_HOURS) }
      : s.stock;
    set({ s: { ...s, money: s.money - cost, stations, stock } });
    sfx.buy();
    if (wasLocked) {
      track('station_unlocked', { stationId });
      get().showBanner(def.emoji, 'New dish!', `${def.name} just hit the menu.`);
    }
  },

  hireManager: (stationId) => {
    const { s } = get();
    const def = STATION_BY_ID[stationId];
    const st = s.stations[stationId];
    const cost = managerCost(s, def);
    if (st.manager || st.level === 0 || s.money < cost) return;
    set({
      s: {
        ...s,
        money: s.money - cost,
        stations: { ...s.stations, [stationId]: { ...st, manager: true, running: true } },
        stats: { ...s.stats, managersHired: s.stats.managersHired + 1 },
      },
    });
    sfx.hire();
    track('manager_hired', { stationId });
    const ability = ABILITY_BY_STATION[stationId];
    get().showBanner(
      '👔',
      `${def.managerName} hired!`,
      ability ? `${def.name} is now automatic — and unlocked their ability: ${ability.name}` : `${def.name} now runs on its own.`,
    );
  },

  tapStation: (stationId) => {
    const { s } = get();
    const st = s.stations[stationId];
    if (!st || st.level === 0 || st.running || st.manager) return;
    sfx.tap();
    set({
      s: {
        ...s,
        stats: { ...s.stats, taps: s.stats.taps + 1 },
        stations: { ...s.stations, [stationId]: { ...st, running: true } },
      },
    });
  },

  buyUpgrade: (id) => {
    const { s } = get();
    const u = UPGRADE_BY_ID[id];
    if (!u || s.upgrades.includes(id) || s.money < u.cost) return;
    set({
      s: {
        ...s,
        money: s.money - u.cost,
        upgrades: [...s.upgrades, id],
        stats: { ...s.stats, upgradesBought: s.stats.upgradesBought + 1 },
      },
    });
    sfx.upgrade();
    track('upgrade_bought', { id });
    get().showToast(`${u.emoji} ${u.name} purchased!`);
  },

  useAbility: (id) => {
    const { s } = get();
    const def: AbilityDef | undefined = Object.values(ABILITY_BY_STATION).find((a) => a.id === id);
    if (!def) return;
    if (!s.stations[def.stationId]?.manager) return;
    const now = Date.now();
    if ((s.abilityReady[id] ?? 0) > now) return;

    const next: GameState = {
      ...s,
      abilityReady: { ...s.abilityReady, [id]: now + abilityCooldown(s, def.cooldownMs) },
      stats: { ...s.stats, abilitiesUsed: s.stats.abilitiesUsed + 1 },
    };

    if (def.effect.kind === 'cash') {
      const gain = incomePerSec(s) * def.effect.seconds;
      next.money += gain;
      next.lifetime += gain;
      next.runEarnings += gain;
      get().showToast(`${def.emoji} ${def.name}: +🪙 ${math.fmt(gain)}`);
    } else {
      const boostPerk = 1 + perkLevel(s.perks, 'ad_master') * 0.25;
      next.effects = addEffect(s.effects, {
        kind: def.effect.kind,
        mult: def.effect.mult,
        until: now + def.effect.ms * boostPerk,
        source: def.id,
        emoji: def.emoji,
      });
      get().showToast(`${def.emoji} ${def.name} active!`);
    }

    set({ s: next });
    sfx.ability();
    track('ability_used', { id });
  },

  catchVip: () => {
    const { s } = get();
    if (s.event?.kind !== 'vip' || s.event.until <= Date.now()) return;
    const gain = incomePerSec(s) * (s.event.rewardSeconds ?? VIP_REWARD_SECONDS);
    set({
      s: {
        ...s,
        money: s.money + gain,
        lifetime: s.lifetime + gain,
        runEarnings: s.runEarnings + gain,
        event: null,
        nextEventAt: Date.now() + EVENT_MIN_MS,
        reputation: Math.min(100, s.reputation + 0.6),
        stats: { ...s.stats, vipCaught: s.stats.vipCaught + 1 },
      },
    });
    sfx.coin();
    track('vip_caught', {});
    get().showToast(`🎩 VIP guest: +🪙 ${math.fmt(gain)}`);
  },

  buyPerk: (id) => {
    const { s } = get();
    const def = PERK_BY_ID[id];
    if (!def) return;
    const cost = perkNextCost(s.perks, def);
    if (cost == null || s.stars < cost) return;
    const lvl = perkLevel(s.perks, id) + 1;
    set({
      s: { ...s, stars: s.stars - cost, starsSpent: s.starsSpent + cost, perks: { ...s.perks, [id]: lvl } },
    });
    sfx.upgrade();
    track('perk_bought', { id, lvl });
    get().showToast(`${def.emoji} ${def.name} → level ${lvl}`);
  },

  claimOffline: (doubled) => {
    const { s, offline } = get();
    if (!offline) return;
    const gain = offline.earned * (doubled ? 2 : 1);
    // A távollét alatt elfogyott alapanyagot le kell vonni — a reklámos duplázás
    // a pénzt duplázza, nem a felhasznált hozzávalókat.
    const stock = { ...s.stock };
    for (const [id, used] of Object.entries(offline.consumed)) {
      stock[id] = Math.max(0, (stock[id] ?? 0) - used);
    }
    set({
      s: {
        ...s,
        money: s.money + gain,
        lifetime: s.lifetime + gain,
        runEarnings: s.runEarnings + gain,
        stock,
        stats: { ...s.stats, adsWatched: s.stats.adsWatched + (doubled ? 1 : 0) },
      },
      offline: null,
    });
    sfx.coin();
    track('offline_claimed', { doubled, gain });
  },

  /** Töredékek jóváírása — a játék minden jutalmazó pontja ezen keresztül ad séfet. */
  grantFragments: (chefId, amount) => {
    const { s } = get();
    const def = CHEF_BY_ID[chefId];
    if (!def || amount <= 0) return;
    const cur = chefState(s, chefId);
    const chefs = { ...s.chefs, [chefId]: { ...cur, fragments: cur.fragments + amount } };
    set({ s: { ...s, chefs } });
    track('fragments_granted', { chefId, amount });
  },

  /** Megszerzés (0 → 1. szint) és szintlépés ugyanaz a művelet, töredékekből. */
  upgradeChef: (chefId) => {
    const { s } = get();
    const def = CHEF_BY_ID[chefId];
    if (!def) return;
    const cur = chefState(s, chefId);
    const need = fragmentsForNext(def, cur.level);
    if (need == null || cur.fragments < need) return;

    const level = cur.level + 1;
    const chefs = { ...s.chefs, [chefId]: { fragments: cur.fragments - need, level } };
    // Az első séfet automatikusan ki is nevezzük — legyen azonnal látható haszna.
    const roster = level === 1 && s.roster.length < s.slots ? [...s.roster, chefId] : s.roster;
    set({ s: { ...s, chefs, roster } });
    sfx.prestige();
    track('chef_upgraded', { chefId, level });
    if (level === 1) {
      get().showBanner(def.emoji, `${def.name} joined!`, describeEffect(def, 1));
    } else {
      get().showToast(`${def.emoji} ${def.name} → level ${level}`);
    }
  },

  toggleChef: (chefId) => {
    const { s } = get();
    if (chefState(s, chefId).level <= 0) return;
    if (s.roster.includes(chefId)) {
      set({ s: { ...s, roster: s.roster.filter((x) => x !== chefId) } });
      sfx.tap();
      return;
    }
    if (s.roster.length >= s.slots) {
      get().showToast('No free spots left in the kitchen.');
      return;
    }
    set({ s: { ...s, roster: [...s.roster, chefId] } });
    sfx.hire();
  },

  buyFragments: (chefId, amount) => {
    const { s } = get();
    const def = CHEF_BY_ID[chefId];
    if (!def) return;
    const cost = FRAGMENT_GEM_COST[def.rarity] * amount;
    if (s.gems < cost) {
      get().showToast('Not enough 💎 — you can get more in the shop.');
      return;
    }
    const cur = chefState(s, chefId);
    set({
      s: {
        ...s,
        gems: s.gems - cost,
        chefs: { ...s.chefs, [chefId]: { ...cur, fragments: cur.fragments + amount } },
      },
    });
    sfx.upgrade();
    track('fragments_bought', { chefId, amount, cost });
  },

  buySlot: () => {
    const { s } = get();
    const cost = slotCost(s.slots);
    if (cost == null || s.gems < cost) return;
    set({ s: { ...s, gems: s.gems - cost, slots: s.slots + 1 } });
    sfx.hire();
    track('chef_slot_bought', { slots: s.slots + 1, cost });
    get().showToast('👨‍🍳 New spot in the kitchen!');
  },

  setPriceTier: (tier) => {
    const { s } = get();
    if (tier < 0 || tier >= PRICE_TIERS.length || tier === s.priceTier) return;
    set({ s: { ...s, priceTier: tier } });
    sfx.buy();
    track('price_tier_set', { tier });
    const t = PRICE_TIERS[tier];
    get().showToast(`${t.emoji} ${t.name} — net effect x${management.netRate(t.price, s.reputation).toFixed(2)}`);
  },

  buyStock: (stationId, hours) => {
    const { s } = get();
    const cost = stockCostForHours(s, stationId, hours);
    if (s.money < cost) {
      get().showToast('Not enough money for that batch.');
      return;
    }
    const qty = servingsForHours(s, stationId, hours);
    set({
      s: {
        ...s,
        money: s.money - cost,
        stock: { ...s.stock, [stationId]: (s.stock[stationId] ?? 0) + qty },
      },
    });
    sfx.upgrade();
    track('stock_bought', { stationId, hours, qty });
  },

  buyContract: (stationId) => {
    const { s } = get();
    if (s.contracts.includes(stationId)) return;
    const cost = contractCost(s, stationId);
    if (s.money < cost) return;
    set({ s: { ...s, money: s.money - cost, contracts: [...s.contracts, stationId] } });
    sfx.hire();
    track('contract_bought', { stationId });
    get().showToast('📦 Supplier contract signed — this station never runs dry again.');
  },

  awardShift: (result, doubled) => {
    const { s } = get();
    const gain = incomePerSec(s) * result.rewardSeconds * (doubled ? 2 : 1);
    // A jól sikerült műszak hírnevet is hoz — ez a fő módja a 50 feletti hírnévnek,
    // vagyis a magasabb árak kiérdemlésének.
    const repGain = (result.served * 0.12 + result.accuracy * 3 - result.lost * 0.15)
      * (1 + chefs.chefBonus(s, 'reputation', 'global') / 100);
    // Csillagonként egy töredék a nap séfjéből — a jó műszak a gyűjteményt is viszi.
    const stars = shift.shiftStars(result);
    const dayChef = chefOfTheDay(dayNumber());
    const curChef = chefState(s, dayChef.id);
    set({
      s: {
        ...s,
        money: s.money + gain,
        lifetime: s.lifetime + gain,
        runEarnings: s.runEarnings + gain,
        reputation: Math.max(0, Math.min(100, s.reputation + repGain)),
        chefs: stars > 0
          ? { ...s.chefs, [dayChef.id]: { ...curChef, fragments: curChef.fragments + stars } }
          : s.chefs,
        bestShift: Math.max(s.bestShift, result.points),
        league: { ...s.league, points: s.league.points + result.points },
        stats: {
          ...s.stats,
          shiftsPlayed: s.stats.shiftsPlayed + 1,
          customersServed: s.stats.customersServed + result.served,
          adsWatched: s.stats.adsWatched + (doubled ? 1 : 0),
        },
      },
    });
    sfx.coin();
    track('shift_finished', { ...result, doubled, stars });
    if (stars > 0) {
      get().showToast(`${dayChef.emoji} ${dayChef.name}: +${stars} fragments`);
    }
    if (result.points > s.bestShift && s.stats.shiftsPlayed > 0) {
      get().showBanner('🏅', 'New record!', `${Math.round(result.points * 10) / 10} points — your best shift yet.`);
    }
  },

  startShiftCooldown: () => {
    const { s } = get();
    set({ s: { ...s, shiftReadyAt: Date.now() + SHIFT_COOLDOWN_MS } });
  },

  /** Reklám után ingyen elérhető a következő műszak. */
  clearShiftCooldown: () => {
    const { s } = get();
    set({ s: { ...s, shiftReadyAt: 0, stats: { ...s.stats, adsWatched: s.stats.adsWatched + 1 } } });
    track('shift_cooldown_ad', {});
  },

  skipShiftCooldown: () => {
    const { s } = get();
    if (s.gems < SHIFT_SKIP_GEMS) {
      get().showToast('Not enough 💎 — watch an ad instead.');
      return;
    }
    set({ s: { ...s, gems: s.gems - SHIFT_SKIP_GEMS, shiftReadyAt: 0 } });
    sfx.upgrade();
    track('shift_cooldown_skipped', { cost: SHIFT_SKIP_GEMS });
  },

  spendGems: (kind) => {
    const { s } = get();
    const price = GEM_PRICES[kind];
    if (s.gems < price) {
      get().showToast('Not enough 💎 — you can get more in the shop.');
      return;
    }
    const next = { ...s, gems: s.gems - price };
    if (kind === 'cash') {
      const gain = incomePerSec(s) * 7200;
      next.money += gain;
      next.lifetime += gain;
      next.runEarnings += gain;
      get().showToast(`+🪙 ${math.fmt(gain)} instantly!`);
    }
    if (kind === 'boost') {
      next.effects = addEffect(s.effects, {
        kind: 'income', mult: AD_BOOST_MULT, until: Date.now() + AD_BOOST_MS * 3,
        source: 'gem_boost', emoji: '🔥',
      });
      get().showToast('x3 income for 12 minutes!');
    }
    set({ s: next });
    sfx.upgrade();
    track('gem_spent', { kind, price });
  },

  watchAdBoost: () => {
    const { s } = get();
    const boostPerk = 1 + perkLevel(s.perks, 'ad_master') * 0.25;
    set({
      s: {
        ...s,
        effects: addEffect(s.effects, {
          kind: 'income', mult: AD_BOOST_MULT, until: Date.now() + AD_BOOST_MS * boostPerk,
          source: 'ad_boost', emoji: '🔥',
        }),
        stats: { ...s.stats, adsWatched: s.stats.adsWatched + 1 },
      },
    });
    sfx.ability();
    track('ad_boost', {});
    get().showToast(`x${AD_BOOST_MULT} income activated!`);
  },

  prestige: () => {
    const { s } = get();
    const gain = Math.max(0, starsFor(s.lifetime) - s.stars - s.starsSpent);
    if (gain < MIN_PRESTIGE_STARS) return;

    const stations = freshStations();
    // Örökség perk: az első N fogás azonnal 25. szinten indul.
    const heritage = perkLevel(s.perks, 'head_start');
    for (let i = 0; i < heritage && i < STATIONS.length; i++) {
      stations[STATIONS[i].id].level = 25;
    }

    set({
      s: {
        ...s,
        money: 0,
        runEarnings: 0,
        stations,
        upgrades: [],
        // Az új étterem új beszerzési lánccal indul; a menedzsment-réteg a 3.
        // fogásnál kapcsol vissza, friss induló készlettel. A hírnév viszont
        // marad — azt a séf viszi magával, nem az étterem.
        stock: {},
        contracts: [],
        managementUnlocked: false,
        effects: [],
        event: null,
        nextEventAt: Date.now() + EVENT_MIN_MS,
        abilityReady: {},
        stars: s.stars + gain,
        stats: { ...s.stats, prestiges: s.stats.prestiges + 1 },
      },
    });
    sfx.prestige();
    track('prestige', { gain, total: s.stars + gain });
    get().showBanner('⭐', `+${gain} Michelin stars!`, 'A new restaurant, with a permanent bonus. Spend your stars on perks!');
  },

  claimDaily: () => {
    const { s } = get();
    const today = new Date().toDateString();
    if (new Date(s.lastDaily).toDateString() === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const streak = new Date(s.lastDaily).toDateString() === yesterday ? s.dailyStreak + 1 : 1;
    const gems = 5 + Math.min(streak, 7) * 5;
    // A napi ajándék mindig a nap séfjének töredékeit is hozza: így a gyűjtemény
    // pusztán visszatéréssel is halad, vásárlás nélkül.
    const chef = chefOfTheDay(dayNumber());
    const frags = 2 + Math.min(streak, 5);
    const cur = chefState(s, chef.id);
    set({
      s: {
        ...s,
        gems: s.gems + gems,
        chefs: { ...s.chefs, [chef.id]: { ...cur, fragments: cur.fragments + frags } },
        dailyStreak: streak,
        lastDaily: Date.now(),
      },
    });
    sfx.coin();
    track('daily_claim', { streak, gems, chefId: chef.id, frags });
    get().showBanner('🎁', `Daily gift: +${gems} 💎`, `${chef.emoji} ${chef.name}: +${frags} fragments · day ${streak}`);
  },

  grantIap: (sku) => {
    const { s } = get();
    const next = { ...s };
    if (sku === 'gems_small') next.gems += 100;
    if (sku === 'gems_large') next.gems += 1200;
    if (sku === 'starter') {
      next.gems += 250;
      next.money += incomePerSec(s) * 3600 * 4;
      next.noAds = true;
    }
    if (sku === 'vip') { next.vip = true; next.noAds = true; next.gems += 500; }
    if (sku === 'noads') next.noAds = true;
    if (sku === 'gems_mega') next.gems += 3500;
    if (sku === 'whale') {
      next.vip = true;
      next.noAds = true;
      next.gems += 10000;
      next.money += incomePerSec(s) * 3600 * 24;
      next.slots = Math.min(MAX_SLOTS, s.slots + 1);
    }
    set({ s: next });
    track('iap_granted', { sku });
    get().showToast('Thanks for your purchase! 🎉');
  },

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set((p) => (p.toast === msg ? { toast: null } : {})), 2600);
  },

  showBanner: (emoji, title, text) => {
    // Sorban állunk: több küldetés/trófea egyszerre is teljesülhet, és kár lenne,
    // ha az utolsó elnyomná a többit — a játékos épp a jutalmát ünnepelné.
    bannerQueue.push({ emoji, title, text });
    if (!bannerTimer) showNextBanner(set);
  },

  save: () => {
    const s = get().s;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
  },

  hardReset: () => {
    localStorage.removeItem(SAVE_KEY);
    set({ s: freshState(), offline: null });
  },
}));

/**
 * Küldetések és achievementek kiértékelése. Nem minden tickben fut (lásd CHECK_INTERVAL_MS),
 * mert 20+ predikátum kiértékelése 60 ms-onként felesleges akkuzabálás mobilon.
 */
function checkProgress(get: () => Store, set: (partial: Partial<Store>) => void) {
  const store = get();
  const s = store.s;
  let changed = false;
  const next: GameState = { ...s };

  /*
   * Ingyen első manager a 10. szinten.
   *
   * Enélkül a játékos addig egyáltalán nem termel, amíg nem koppint — és aki az
   * első manager megvétele előtt leteszi a telefont, üres kézzel tér vissza.
   * Egy idle játéknál ez a leggyakoribb lemorzsolódási pont. Így viszont az
   * offline gazdaság már az első percben él.
   */
  /*
   * A menedzsment-réteg a 3. fogásnál kapcsol be — addig a játék hagyja,
   * hogy a játékos megértse az alapokat. Bekapcsoláskor kap induló készletet,
   * különben azonnal leállna minden pult.
   */
  if (!s.managementUnlocked) {
    const open = STATIONS.filter((d) => s.stations[d.id].level > 0).length;
    if (open >= MANAGEMENT_UNLOCK_STATIONS) {
      changed = true;
      next.managementUnlocked = true;
      next.stock = Object.fromEntries(
        STATIONS.map((d) => [d.id, s.stations[d.id].level > 0 ? servingsForHours(s, d.id, STARTING_STOCK_HOURS) : 0]),
      );
      store.showBanner('📋', 'Restaurant management unlocked!', 'Pricing, reputation, and ingredients — on the Management tab.');
      track('management_unlocked', {});
    }
  }

  const firstId = STATIONS[0].id;
  const first = s.stations[firstId];
  if (!first.manager && first.level >= 10) {
    changed = true;
    next.stations = { ...next.stations, [firstId]: { ...first, manager: true, running: true } };
    next.stats = { ...next.stats, managersHired: next.stats.managersHired + 1 };
    store.showBanner('👔', 'Yuki steps in to help!', 'Free manager — Maki Roll now produces on its own, even while you\'re away.');
    sfx.hire();
    track('starter_manager_granted', {});
  }

  // Michelin-fokozat: a karrier-csillagokból és a prestige-számból nyílik,
  // nem tárolt állapot — csak a "most kaptad" banner-jelzéshez követjük.
  const rank = michelinRankFor(s.stars + s.starsSpent, s.stats.prestiges);
  if (rank.id > s.michelinRankSeen) {
    changed = true;
    next.michelinRankSeen = rank.id;
    store.showBanner(rank.emoji, `${rank.name}!`, `+${Math.round((rank.mult - 1) * 100)}% permanent income — a new endgame tier has opened.`);
    track('michelin_rank', { rank: rank.id });
  }

  // Liga: hetente lezárul a forduló, és eldől a rangsor + fel-/kiesés.
  // Determinisztikus botok, nulla backend — lásd game/league.ts.
  const wk = weekNumber();
  if (wk > s.league.weekNumber) {
    changed = true;
    const outcome: WeekOutcome = resolveWeek(s, s.league.weekNumber, s.league.division, s.league.points);
    const newDivision = nextDivision(s.league.division, outcome);
    next.league = { weekNumber: wk, division: newDivision, points: 0 };
    next.lastLeagueOutcome = outcome;
    next.gems = s.gems + outcome.gems;
    if (outcome.fragments > 0) {
      const dayChef = chefOfTheDay(dayNumber());
      const cur = chefState(s, dayChef.id);
      next.chefs = { ...next.chefs, [dayChef.id]: { ...cur, fragments: cur.fragments + outcome.fragments } };
    }
    const title = outcome.promoted
      ? `Promoted! ${DIVISIONS[newDivision].emoji} ${DIVISIONS[newDivision].name}`
      : outcome.relegated
        ? `Relegated — ${DIVISIONS[newDivision].name}`
        : `League ended: rank ${outcome.rank}`;
    const text = `+${outcome.gems} 💎${outcome.fragments > 0 ? ` · +${outcome.fragments} fragments` : ''}`;
    store.showBanner('🏆', title, text);
    track('league_week_resolved', { ...outcome, newDivision });
  }

  // Teljesített küldetések: jutalom + a lánc következő eleme lép be.
  for (const qid of s.activeQuests) {
    const q = QUEST_BY_ID[qid];
    if (!q || q.progress(s) < q.target) continue;
    changed = true;
    next.doneQuests = [...next.doneQuests, qid];
    next.activeQuests = next.activeQuests.filter((x) => x !== qid);
    const incoming = nextQuestId(next.activeQuests, next.doneQuests);
    if (incoming) next.activeQuests = [...next.activeQuests, incoming];

    if (q.reward.gems) next.gems += q.reward.gems;
    if (q.reward.cashSeconds) {
      const gain = incomePerSec(s) * q.reward.cashSeconds;
      next.money += gain;
      next.lifetime += gain;
      next.runEarnings += gain;
    }
    const rewardText = q.reward.gems ? `+${q.reward.gems} 💎` : `+${math.fmt(incomePerSec(s) * (q.reward.cashSeconds ?? 0))} 🪙`;
    store.showBanner('🎯', 'Quest complete!', `${q.name} — ${rewardText}`);
    sfx.quest();
  }

  // Achievementek: állandó bevétel-bónusz, prestige-t is túlélik.
  for (const a of ACHIEVEMENTS) {
    if (next.achievements.includes(a.id) || !a.done(s)) continue;
    changed = true;
    next.achievements = [...next.achievements, a.id];
    store.showBanner(a.emoji, `Trophy: ${a.name}`, `${a.desc} — all income +3%`);
    sfx.quest();
  }

  if (changed) set({ s: next });
}

/** Hány küldetés van még hátra a láncból (UI-hoz). */
export function questsRemaining(s: GameState): number {
  return QUESTS.length - s.doneQuests.length;
}

// Fejlesztői konzol-hozzáférés: window.__game.getState() / .setState()
// Balanszteszthez és QA-hoz. Prod buildből kimarad.
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.__game = useGame;
  w.__math = math;
  w.__shift = shift;
  w.__mgmt = management;
  w.__chefs = chefs;
}
