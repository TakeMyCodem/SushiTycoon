/**
 * Michelin-fokozatok — végjáték (Nap 3, lásd docs/HETI-TERV.md).
 *
 * A sima "csillag" (`s.stars`) a prestige-valuta, ezt költöd perkekre.
 * A Michelin-**fokozat** ettől külön dolog: a karrier összes csillagából
 * (`stars + starsSpent`, tehát az elköltött is számít) ÉS a prestige-ek
 * számából együtt nyílik — így nem lehet egyetlen hosszú, prestige nélküli
 * futással "átugrani" a végjátékot, valódi ismétlést kíván.
 *
 * Tiszta logika, state nélkül: a rangot mindig a karrier-adatokból számoljuk,
 * nem tároljuk külön (a `michelinRankSeen` a store-ban csak a "most kaptad"
 * bannerhez kell).
 */

export interface MichelinRank {
  id: number;
  name: string;
  emoji: string;
  requireStars: number;
  requirePrestiges: number;
  /** Globális bevételszorzó ennél a foknál (a sima csillag-bónusztól függetlenül). */
  mult: number;
}

export const MICHELIN_RANKS: MichelinRank[] = [
  { id: 0, name: 'No Rank Yet', emoji: '🍽️', requireStars: 0, requirePrestiges: 0, mult: 1 },
  { id: 1, name: '1 Michelin Star', emoji: '⭐', requireStars: 100, requirePrestiges: 3, mult: 1.15 },
  { id: 2, name: '2 Michelin Stars', emoji: '⭐⭐', requireStars: 400, requirePrestiges: 8, mult: 1.35 },
  { id: 3, name: '3 Michelin Stars', emoji: '⭐⭐⭐', requireStars: 1000, requirePrestiges: 15, mult: 1.6 },
];

export function michelinRankFor(careerStars: number, prestiges: number): MichelinRank {
  let best = MICHELIN_RANKS[0];
  for (const r of MICHELIN_RANKS) {
    if (careerStars >= r.requireStars && prestiges >= r.requirePrestiges) best = r;
  }
  return best;
}

export function michelinMult(careerStars: number, prestiges: number): number {
  return michelinRankFor(careerStars, prestiges).mult;
}

export function nextMichelinRank(careerStars: number, prestiges: number): MichelinRank | null {
  const cur = michelinRankFor(careerStars, prestiges);
  return MICHELIN_RANKS[cur.id + 1] ?? null;
}
