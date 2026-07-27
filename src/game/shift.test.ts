import { describe, expect, it } from 'vitest';
import {
  comboMult, finishShift, newShift, serveDish, shiftStars, stepShift, KIND_VALUE,
} from './shift';

describe('comboMult', () => {
  it('is 1x below the first combo step', () => {
    expect(comboMult(4)).toBe(1);
  });

  it('increases by 0.5x every 5 combo, capped at x5', () => {
    expect(comboMult(5)).toBe(1.5);
    expect(comboMult(10)).toBe(2);
    expect(comboMult(45)).toBe(5); // (1 + floor(45/5)*0.5) = 1+4.5 = 5.5 -> capped
    expect(comboMult(1000)).toBe(5);
  });
});

describe('serveDish', () => {
  it('resets combo and counts a mistake when no customer wants that dish', () => {
    const st = newShift();
    const { state, ok, gained } = serveDish(st, 'maki');
    expect(ok).toBe(false);
    expect(gained).toBe(0);
    expect(state.mistakes).toBe(1);
    expect(state.combo).toBe(0);
  });

  it('serves the oldest matching customer and awards points scaled by kind value and combo', () => {
    let st = newShift();
    st = {
      ...st,
      queue: [
        { id: 1, dish: 'maki', kind: 'normal', remaining: 1, bornAt: 0, patienceMs: 9000 },
        { id: 2, dish: 'maki', kind: 'vip', remaining: 1, bornAt: 100, patienceMs: 5000 },
      ],
    };
    const { state, ok, gained } = serveDish(st, 'maki');
    expect(ok).toBe(true);
    // The FIRST (oldest) matching customer is served, not the highest-value one.
    expect(state.served).toBe(1);
    expect(gained).toBe(KIND_VALUE.normal); // combo was 0, so comboMult(0) = 1x
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].kind).toBe('vip');
  });

  it('a big order needs two serves and only awards points on the second (final) one', () => {
    let st = newShift();
    st = { ...st, queue: [{ id: 1, dish: 'maki', kind: 'big', remaining: 2, bornAt: 0, patienceMs: 9000 }] };
    const first = serveDish(st, 'maki');
    expect(first.ok).toBe(true);
    expect(first.gained).toBe(0); // not finished yet
    expect(first.state.queue[0].remaining).toBe(1);
    expect(first.state.served).toBe(0); // not counted as "served" until finished

    const second = serveDish(first.state, 'maki');
    expect(second.ok).toBe(true);
    expect(second.gained).toBeGreaterThan(0);
    expect(second.state.served).toBe(1);
    expect(second.state.queue).toHaveLength(0);
  });
});

describe('stepShift', () => {
  it('drops a customer once their patience runs out, and resets the combo', () => {
    let st = newShift();
    // nextSpawnAt is far in the future so this step can't also spawn a
    // replacement customer — isolates the drop behavior from spawning.
    st = { ...st, combo: 3, nextSpawnAt: 999_999, queue: [{ id: 1, dish: 'maki', kind: 'normal', remaining: 1, bornAt: 0, patienceMs: 1000 }] };
    const { state, lostNow } = stepShift(st, 1500, ['maki']);
    expect(lostNow).toBe(1);
    expect(state.queue).toHaveLength(0);
    expect(state.lost).toBe(1);
    expect(state.combo).toBe(0);
  });

  it('does not drop a customer who still has patience left', () => {
    let st = newShift();
    st = { ...st, queue: [{ id: 1, dish: 'maki', kind: 'normal', remaining: 1, bornAt: 0, patienceMs: 5000 }] };
    const { lostNow } = stepShift(st, 500, ['maki']);
    expect(lostNow).toBe(0);
  });
});

describe('finishShift', () => {
  it('gives zero reward for an empty shift', () => {
    const r = finishShift(newShift(), false);
    expect(r.served).toBe(0);
    expect(r.rewardSeconds).toBe(0);
    expect(r.accuracy).toBe(0); // 0/0 guarded, not NaN
  });

  it('doubles the raw reward during a rush bonus', () => {
    const st = { ...newShift(), points: 20 };
    const normal = finishShift(st, false);
    const rushed = finishShift(st, true);
    expect(rushed.rewardSeconds).toBe(normal.rewardSeconds * 2);
    expect(rushed.rushBonus).toBe(true);
  });

  it('applies the chef points multiplier before computing the reward', () => {
    const st = { ...newShift(), points: 20 };
    const base = finishShift(st, false, 1);
    const boosted = finishShift(st, false, 1.25);
    expect(boosted.points).toBeCloseTo(base.points * 1.25, 5);
  });

  it('accuracy is servedCount / totalAttempts', () => {
    const st = { ...newShift(), served: 8, lost: 1, mistakes: 1 };
    const r = finishShift(st, false);
    expect(r.accuracy).toBeCloseTo(0.8, 5);
  });
});

describe('shiftStars', () => {
  it('gives 0 stars below the 1-star threshold', () => {
    expect(shiftStars({ served: 5, lost: 0, mistakes: 0, bestCombo: 0, points: 0, accuracy: 1, rewardSeconds: 0, rushBonus: false })).toBe(0);
  });

  it('gives 3 stars for a high-volume, high-accuracy shift', () => {
    expect(shiftStars({ served: 35, lost: 0, mistakes: 1, bestCombo: 10, points: 100, accuracy: 0.95, rewardSeconds: 100, rushBonus: false })).toBe(3);
  });

  it('accuracy below both the 2-star and 3-star gates drops it to 1 star, even with plenty served', () => {
    expect(shiftStars({ served: 35, lost: 10, mistakes: 10, bestCombo: 10, points: 100, accuracy: 0.7, rewardSeconds: 100, rushBonus: false })).toBe(1);
  });
});
