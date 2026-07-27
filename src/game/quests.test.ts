import { describe, expect, it } from 'vitest';
import { QUESTS, QUEST_BY_ID, initialQuests, nextQuestId } from './quests';
import { makeState } from './test-helpers';

describe('QUESTS data integrity', () => {
  it('has no duplicate ids', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every quest has progress 0 (or effectively 0) on a fresh state', () => {
    const s = makeState();
    for (const q of QUESTS) {
      expect(q.progress(s), `${q.id} (${q.name}) should start below target`).toBeLessThan(q.target);
    }
  });

  it('every quest reward has at least a gems or cashSeconds payout — never an empty reward', () => {
    for (const q of QUESTS) {
      expect(q.reward.gems != null || q.reward.cashSeconds != null, `${q.id} has no reward`).toBe(true);
    }
  });
});

describe('initialQuests / nextQuestId', () => {
  it('starts with exactly the first 3 quests in the chain', () => {
    expect(initialQuests()).toEqual([QUESTS[0].id, QUESTS[1].id, QUESTS[2].id]);
  });

  it('nextQuestId returns the first quest that is neither active nor done, preserving chain order', () => {
    const active = [QUESTS[0].id, QUESTS[1].id];
    const done = [QUESTS[2].id];
    expect(nextQuestId(active, done)).toBe(QUESTS[3].id);
  });

  it('nextQuestId returns null once the entire chain is active or done', () => {
    const all = QUESTS.map((q) => q.id);
    expect(nextQuestId(all, [])).toBeNull();
    expect(nextQuestId([], all)).toBeNull();
  });
});

describe('QUEST_BY_ID', () => {
  it('indexes every quest', () => {
    for (const q of QUESTS) expect(QUEST_BY_ID[q.id]).toBe(q);
  });
});

describe('a couple of representative progress functions', () => {
  it('q1 tracks Maki Roll level directly', () => {
    const s = makeState({ stations: { ...makeState().stations, maki: { level: 17, manager: false, progress: 0, running: false } } });
    expect(QUEST_BY_ID.q1.progress(s)).toBe(17);
  });

  it('q10 (total levels) sums every station, not just one', () => {
    const s = makeState({
      stations: {
        ...makeState().stations,
        maki: { level: 10, manager: false, progress: 0, running: false },
        nigiri: { level: 5, manager: false, progress: 0, running: false },
      },
    });
    expect(QUEST_BY_ID.q10.progress(s)).toBe(15);
  });

  it('q15 (best single-dish level) takes the max across stations, not the sum', () => {
    const s = makeState({
      stations: {
        ...makeState().stations,
        maki: { level: 10, manager: false, progress: 0, running: false },
        nigiri: { level: 80, manager: false, progress: 0, running: false },
      },
    });
    expect(QUEST_BY_ID.q15.progress(s)).toBe(80);
  });
});
