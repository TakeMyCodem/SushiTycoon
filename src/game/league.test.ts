import { describe, expect, it } from 'vitest';
import { DIVISIONS, LEAGUE_SIZE, PROMOTE_COUNT, RELEGATE_COUNT, botScores, nextDivision, rankOf, resolveWeek } from './league';
import { makeState } from './test-helpers';

describe('botScores', () => {
  it('is deterministic: same week/division/player state always gives the same bots', () => {
    const s = makeState({ bestShift: 50 });
    expect(botScores(s, 10, 0)).toEqual(botScores(s, 10, 0));
  });

  it('produces LEAGUE_SIZE - 1 bots (the player fills the last seat)', () => {
    const s = makeState({ bestShift: 50 });
    expect(botScores(s, 10, 0)).toHaveLength(LEAGUE_SIZE - 1);
  });

  it('scales up with the division tier for the same week and player state', () => {
    const s = makeState({ bestShift: 50 });
    const bronzeAvg = average(botScores(s, 5, 0));
    const diamondAvg = average(botScores(s, 5, 4));
    expect(diamondAvg).toBeGreaterThan(bronzeAvg);
  });
});

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

describe('rankOf', () => {
  it('is 1st place when beating every bot', () => {
    expect(rankOf(1000, [10, 20, 30])).toBe(1);
  });

  it('is last place when losing to every bot', () => {
    expect(rankOf(0, [10, 20, 30])).toBe(4);
  });

  it('counts ties as NOT beating the bot (bot keeps the better rank)', () => {
    expect(rankOf(20, [10, 20, 30])).toBe(2); // only the 30 is strictly greater
  });
});

describe('resolveWeek / nextDivision', () => {
  it('promotes a top-PROMOTE_COUNT finish, except from the top division', () => {
    const s = makeState();
    // A score that beats literally every possible bot roll guarantees rank 1.
    const outcome = resolveWeek(s, 1, 0, Number.MAX_SAFE_INTEGER);
    expect(outcome.rank).toBe(1);
    expect(outcome.promoted).toBe(true);
    expect(outcome.relegated).toBe(false);
    expect(nextDivision(0, outcome)).toBe(1);
  });

  it('does not promote further from the top division', () => {
    const topDivision = DIVISIONS.length - 1;
    const s = makeState();
    const outcome = resolveWeek(s, 1, topDivision, Number.MAX_SAFE_INTEGER);
    expect(outcome.promoted).toBe(false); // nowhere higher to go
    expect(nextDivision(topDivision, outcome)).toBe(topDivision);
  });

  it('relegates a bottom-RELEGATE_COUNT finish, except from the bottom division', () => {
    const s = makeState();
    const outcome = resolveWeek(s, 1, 1, 0); // 0 points, loses to every bot with any positive score
    expect(outcome.relegated).toBe(true);
    expect(nextDivision(1, outcome)).toBe(0);
  });

  it('does not relegate below the bottom division', () => {
    const s = makeState();
    const outcome = resolveWeek(s, 1, 0, 0);
    expect(nextDivision(0, outcome)).toBe(0);
  });

  it('a mid-table finish neither promotes nor relegates, and division stays put', () => {
    const s = makeState({ bestShift: 50 });
    const bots = botScores(s, 1, 2);
    const sorted = [...bots].sort((a, b) => a - b);
    const midScore = sorted[Math.floor(sorted.length / 2)];
    const outcome = resolveWeek(s, 1, 2, midScore);
    const rank = outcome.rank;
    expect(rank).toBeGreaterThan(PROMOTE_COUNT);
    expect(rank).toBeLessThanOrEqual(LEAGUE_SIZE - RELEGATE_COUNT);
    expect(outcome.promoted).toBe(false);
    expect(outcome.relegated).toBe(false);
    expect(nextDivision(2, outcome)).toBe(2);
  });
});
