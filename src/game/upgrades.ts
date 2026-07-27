import { STATIONS } from './config';

/**
 * Fejlesztések — ez adja a játékba a *döntést*.
 *
 * Szintet venni triviális ("van pénzem? veszek"). A fejlesztés viszont
 * választás: most a Makit erősítem, vagy gyűjtök a globális szorzóra?
 * Ezért minden fejlesztés egyszeri és végleges (prestige-ig).
 */
export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  mult: number;
  /** Melyik állomásra hat, vagy 'all' = globális. */
  target: string;
  /** Ennyi szint kell az adott állomáson, hogy megjelenjen. */
  reqLevel: number;
  emoji: string;
}

const TIERS = [
  { req: 10, mult: 2, costFactor: 500, emoji: '🔪', label: 'Sharper Knife' },
  { req: 40, mult: 3, costFactor: 25_000, emoji: '🧊', label: 'Ice Counter' },
  { req: 90, mult: 4, costFactor: 900_000, emoji: '🏅', label: 'Master Technique' },
  { req: 160, mult: 5, costFactor: 40_000_000, emoji: '👑', label: 'Legendary Recipe' },
];

/** Állomásonként 4 fejlesztés, a szintekhez igazított árral. */
const stationUpgrades: UpgradeDef[] = STATIONS.flatMap((st) =>
  TIERS.map((t, i) => ({
    id: `${st.id}_u${i}`,
    name: `${t.label}: ${st.name}`,
    desc: `${st.name} income x${t.mult}`,
    cost: st.baseCost * t.costFactor,
    mult: t.mult,
    target: st.id,
    reqLevel: t.req,
    emoji: t.emoji,
  })),
);

/**
 * Globális fejlesztések: drágák, de mindenre hatnak.
 * Ezek a "megéri-e most félretenni" döntés magja.
 */
const globalUpgrades: UpgradeDef[] = [
  { id: 'g0', name: 'Corner Signboard', desc: 'All income x1.5', cost: 2e5, mult: 1.5, target: 'all', reqLevel: 0, emoji: '🏮' },
  { id: 'g1', name: 'Restaurant Critic', desc: 'All income x2', cost: 5e7, mult: 2, target: 'all', reqLevel: 0, emoji: '📰' },
  { id: 'g2', name: 'City Reputation', desc: 'All income x2.5', cost: 2e10, mult: 2.5, target: 'all', reqLevel: 0, emoji: '🌆' },
  { id: 'g3', name: 'National Chain', desc: 'All income x3', cost: 8e12, mult: 3, target: 'all', reqLevel: 0, emoji: '🚚' },
  { id: 'g4', name: 'International Franchise', desc: 'All income x4', cost: 5e15, mult: 4, target: 'all', reqLevel: 0, emoji: '✈️' },
  { id: 'g5', name: 'Michelin Attention', desc: 'All income x5', cost: 3e18, mult: 5, target: 'all', reqLevel: 0, emoji: '🌟' },
];

export const UPGRADES: UpgradeDef[] = [...globalUpgrades, ...stationUpgrades];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<string, UpgradeDef>;
