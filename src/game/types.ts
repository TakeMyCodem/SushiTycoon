export interface StationDef {
  id: string;
  name: string;
  emoji: string;
  /** Első szint ára (a 0. szintről az 1.-re). */
  baseCost: number;
  /** Ár szorzó szintenként. */
  costMult: number;
  /** Bevétel / ciklus / szint (alap). */
  baseIncome: number;
  /** Egy ciklus hossza ms-ban. */
  cycleMs: number;
  /** A manager (automata) ára. */
  managerCost: number;
  /** Manager neve — a "kit veszek fel" fantázia miatt fontos. */
  managerName: string;
}

export interface StationState {
  level: number;
  manager: boolean;
  /** 0..1 aktuális ciklus előrehaladás. */
  progress: number;
  running: boolean;
}

/**
 * Időzített hatás. Minden bevétel- és sebességmódosító ezen keresztül megy
 * (reklám-boost, manager-képesség, csúcsforgalom), így egységesen stackelnek
 * és egy helyen járnak le.
 */
export interface Effect {
  /** 'income' = bevételszorzó, 'speed' = ciklusidő-osztó. */
  kind: 'income' | 'speed';
  mult: number;
  /** Epoch ms, amikor lejár. */
  until: number;
  /** Honnan jött — a UI ezt mutatja. */
  source: string;
  emoji: string;
}

/** Idővel megjelenő esemény: csúcsforgalom vagy VIP vendég. */
export interface GameEvent {
  kind: 'rush' | 'vip';
  until: number;
  /** VIP-nél: hány másodpercnyi termelést ér. */
  rewardSeconds?: number;
}

export interface LeagueState {
  weekNumber: number;
  division: number;
  /** Az aktuális hétre eddig gyűjtött pont — csak a műszak-teljesítményből jön. */
  points: number;
}

export interface Stats {
  taps: number;
  adsWatched: number;
  managersHired: number;
  upgradesBought: number;
  prestiges: number;
  vipCaught: number;
  abilitiesUsed: number;
  rushesSeen: number;
  shiftsPlayed: number;
  customersServed: number;
}

export interface GameState {
  money: number;
  gems: number;
  lifetime: number;
  /** Az aktuális futásban keresett pénz — a küldetésekhez kell. */
  runEarnings: number;
  stars: number;
  /** Prestige-perkekre elköltött csillagok (a szorzót már nem növelik). */
  starsSpent: number;
  stations: Record<string, StationState>;
  upgrades: string[];
  perks: Record<string, number>;
  achievements: string[];
  activeQuests: string[];
  doneQuests: string[];
  /** Képesség id → mikortól használható újra (epoch ms). */
  abilityReady: Record<string, number>;
  effects: Effect[];
  event: GameEvent | null;
  /** Mikor jöjjön a következő esemény (epoch ms). */
  nextEventAt: number;
  vip: boolean;
  noAds: boolean;
  lastSeen: number;
  createdAt: number;
  dailyStreak: number;
  lastDaily: number;
  /** Séfek: töredékek és szintek id szerint. */
  chefs: Record<string, { fragments: number; level: number }>;
  /** A konyhába kinevezett séfek (legfeljebb `slots` darab). */
  roster: string[];
  /** Konyhai helyek száma. */
  slots: number;
  /** Étlap-árszint (index a PRICE_TIERS-ben). */
  priceTier: number;
  /** Hírnév 0-100. Ez dönti el, mennyit kérhetsz el. */
  reputation: number;
  /** Alapanyag-készlet adagban, állomásonként. */
  stock: Record<string, number>;
  /** Ezeken az állomásokon automatikus a beszerzés. */
  contracts: string[];
  /** A menedzsment-réteg a 3. fogás megnyitásakor kapcsol be. */
  managementUnlocked: boolean;
  /** Mikortól indítható újra műszak (epoch ms). */
  shiftReadyAt: number;
  /** Eddigi legjobb műszak-pontszám — ezt kell túlszárnyalni. */
  bestShift: number;
  stats: Stats;
  league: LeagueState;
  /** Az utolsó lezárt hét kimenete — a Liga fülön mutatjuk. */
  lastLeagueOutcome: import('./league').WeekOutcome | null;
  /** A legutóbb bannerrel jelzett Michelin-fokozat id-je — ennél magasabbra ugorva jár új banner. */
  michelinRankSeen: number;
}

export interface OfflineReport {
  ms: number;
  earned: number;
  /** Mennyi alapanyag fogyott el állomásonként a távollét alatt. */
  consumed: Record<string, number>;
  /** Igaz, ha valamelyik állomás alapanyaghiány miatt állt le. */
  ranDry: boolean;
}
