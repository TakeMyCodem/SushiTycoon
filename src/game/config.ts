import type { StationDef } from './types';

/**
 * Balansz: AdVenture Capitalist-szerű geometrikus görbe.
 * Minden állomás ~12x drágább és ~ugyanennyivel jövedelmezőbb az előzőnél,
 * a costMult viszont csökken -> a késői állomások gyorsabban skálázódnak,
 * ezért mindig van értelme az újat nyitni. Ez a "még egy kört" hurok motorja.
 */
export const STATIONS: StationDef[] = [
  { id: 'maki',    name: 'Maki Roll',      emoji: '🍙', baseCost: 4,           costMult: 1.07, baseIncome: 1,           cycleMs: 600,     managerCost: 1000,          managerName: 'Yuki the Intern' },
  { id: 'nigiri',  name: 'Nigiri',         emoji: '🍣', baseCost: 60,          costMult: 1.15, baseIncome: 60,          cycleMs: 3000,    managerCost: 15000,         managerName: 'Hiro the Chef' },
  { id: 'sashimi', name: 'Sashimi Platter',emoji: '🐟', baseCost: 720,         costMult: 1.14, baseIncome: 540,         cycleMs: 6000,    managerCost: 100000,        managerName: 'Aiko the Knife Master' },
  { id: 'uramaki', name: 'Uramaki',        emoji: '🍥', baseCost: 8640,        costMult: 1.13, baseIncome: 4320,        cycleMs: 12000,   managerCost: 500000,        managerName: 'Kenji the Butcher' },
  { id: 'temaki',  name: 'Temaki Cone',    emoji: '🌯', baseCost: 103680,      costMult: 1.12, baseIncome: 51840,       cycleMs: 24000,   managerCost: 1200000,       managerName: 'Mei the Courier' },
  { id: 'tempura', name: 'Tempura',        emoji: '🍤', baseCost: 1244160,     costMult: 1.11, baseIncome: 622080,      cycleMs: 96000,   managerCost: 10000000,      managerName: 'Ren the Oil King' },
  { id: 'ramen',   name: 'Ramen Bowl',     emoji: '🍜', baseCost: 14929920,    costMult: 1.10, baseIncome: 7464360,     cycleMs: 384000,  managerCost: 111000000,     managerName: 'Sora the Soup Queen' },
  { id: 'dragon',  name: 'Dragon Roll',    emoji: '🐉', baseCost: 179159040,   costMult: 1.09, baseIncome: 89579520,    cycleMs: 1536000, managerCost: 1200000000,    managerName: 'Ryu the Legend' },
  { id: 'wagyu',   name: 'Wagyu Nigiri',   emoji: '🥩', baseCost: 2149908480,  costMult: 1.08, baseIncome: 1074954240,  cycleMs: 3072000, managerCost: 14000000000,   managerName: 'Takeshi the Beef Baron' },
  { id: 'kaiseki', name: 'Kaiseki Menu',   emoji: '🍱', baseCost: 25798901760, costMult: 1.07, baseIncome: 29668654080, cycleMs: 6144000, managerCost: 170000000000,  managerName: 'Master Ito' },
];

export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s])) as Record<string, StationDef>;

/** Szint-mérföldkövek: minden elértnél x2 bevétel. */
export const MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800];
/** Ezeknél feleződik a ciklusidő (kumulatívan). */
export const SPEED_MILESTONES = [100, 200, 300];

/** Egy csillag ennyi %-kal növeli a globális bevételt. */
export const STAR_BONUS = 0.03;
/** Prestige-hez legalább ennyi új csillag kell. */
export const MIN_PRESTIGE_STARS = 10;

/** Offline bevétel alap felső határa (ms). Perkkel és VIP-pel nő. */
export const OFFLINE_CAP_MS = 2 * 60 * 60 * 1000;
export const OFFLINE_CAP_VIP_MS = 24 * 60 * 60 * 1000;

/** Reklámos boost. */
export const AD_BOOST_MULT = 3;
export const AD_BOOST_MS = 4 * 60 * 1000;

/* ---------- Események ---------- */

/** Két esemény között ennyi idő telik el (véletlen a két érték között). */
export const EVENT_MIN_MS = 3 * 60_000;
export const EVENT_MAX_MS = 7 * 60_000;
/** Ekkora eséllyel lesz csúcsforgalom VIP vendég helyett. */
export const RUSH_CHANCE = 0.35;
/** Csúcsforgalom: ennyi ideig tart és ennyivel szoroz. */
export const RUSH_MS = 60_000;
export const RUSH_MULT = 2;
/** A VIP vendég ennyi ideig várható meg, és ennyi másodpercnyi bevételt ér. */
export const VIP_WAIT_MS = 20_000;
export const VIP_REWARD_SECONDS = 240;

export const SAVE_KEY = 'sushi-empire-save-v2';
