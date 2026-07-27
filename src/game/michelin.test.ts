import { describe, expect, it } from 'vitest';
import { MICHELIN_RANKS, michelinMult, michelinRankFor, nextMichelinRank } from './michelin';

describe('michelinRankFor', () => {
  it('is rank 0 (no rank) with zero career stars and zero prestiges', () => {
    expect(michelinRankFor(0, 0).id).toBe(0);
  });

  it('requires BOTH the career-star threshold AND the prestige-count threshold — stars alone are not enough', () => {
    // Enough career stars for rank 1 (100), but zero prestiges.
    expect(michelinRankFor(100, 0).id).toBe(0);
  });

  it('requires BOTH thresholds — prestiges alone are not enough', () => {
    // Enough prestiges for rank 1 (3), but zero career stars.
    expect(michelinRankFor(0, 3).id).toBe(0);
  });

  it('reaches rank 1 once both thresholds are met', () => {
    expect(michelinRankFor(100, 3).id).toBe(1);
  });

  it('picks the highest rank whose thresholds are both satisfied', () => {
    expect(michelinRankFor(1000, 15).id).toBe(3);
    expect(michelinRankFor(1_000_000, 999).id).toBe(3); // caps at the top rank
  });

  it('does not skip ahead: high stars but only rank-1-level prestiges caps at rank 1', () => {
    expect(michelinRankFor(1_000_000, 3).id).toBe(1);
  });
});

describe('michelinMult / nextMichelinRank', () => {
  it('mult is 1 at rank 0 (no bonus yet)', () => {
    expect(michelinMult(0, 0)).toBe(1);
  });

  it('mult matches the rank table', () => {
    expect(michelinMult(100, 3)).toBe(MICHELIN_RANKS[1].mult);
  });

  it('nextMichelinRank returns null once at the top rank', () => {
    expect(nextMichelinRank(1_000_000, 999)).toBeNull();
  });

  it('nextMichelinRank returns the immediate next rank otherwise', () => {
    expect(nextMichelinRank(0, 0)?.id).toBe(1);
    expect(nextMichelinRank(100, 3)?.id).toBe(2);
  });
});
