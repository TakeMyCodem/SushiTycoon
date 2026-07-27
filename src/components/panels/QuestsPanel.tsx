import { useGame, questsRemaining } from '../../game/store';
import { QUEST_BY_ID } from '../../game/quests';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS } from '../../game/achievements';
import { fmt } from '../../game/math';

export function QuestsPanel() {
  const s = useGame((g) => g.s);
  const claimDaily = useGame((g) => g.claimDaily);
  const dailyReady = new Date(s.lastDaily).toDateString() !== new Date().toDateString();

  return (
    <div className="panel">
      <div className={`daily ${dailyReady ? 'is-ready' : ''}`}>
        <div>
          <div className="daily-title">🎁 Daily Gift</div>
          <div className="offer-desc">
            {s.dailyStreak > 0 ? `Day ${s.dailyStreak} streak` : 'Start your streak!'} · worth more every day
          </div>
        </div>
        <button className="btn btn-primary btn-inline" disabled={!dailyReady} onClick={claimDaily}>
          {dailyReady ? 'Claim' : 'Tomorrow'}
        </button>
      </div>

      <h3 className="section">Active Quests · {questsRemaining(s)} left</h3>
      {s.activeQuests.map((qid) => {
        const q = QUEST_BY_ID[qid];
        if (!q) return null;
        const prog = Math.min(q.progress(s), q.target);
        const pct = (prog / q.target) * 100;
        return (
          <div key={qid} className="quest">
            <div className="quest-head">
              <span className="quest-name">{q.name}</span>
              <span className="quest-reward">
                {q.reward.gems ? `+${q.reward.gems} 💎` : `${Math.round((q.reward.cashSeconds ?? 0) / 60)} min 🪙`}
              </span>
            </div>
            <div className="progress progress-sm">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
              <span className="progress-label">
                {fmt(prog)} / {fmt(q.target)}
              </span>
            </div>
          </div>
        );
      })}
      {s.activeQuests.length === 0 && (
        <p className="muted">You've completed every quest. More coming in the next update!</p>
      )}

      <h3 className="section">
        Trophies · {s.achievements.length}/{ACHIEVEMENTS.length} · +{Math.round(s.achievements.length * ACHIEVEMENT_BONUS * 100)}% income
      </h3>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = s.achievements.includes(a.id);
          return (
            <div key={a.id} className={`ach ${got ? 'is-got' : ''}`} title={`${a.name} — ${a.desc}`}>
              <span className="ach-emoji">{got ? a.emoji : '🔒'}</span>
              <span className="ach-name">{a.name}</span>
              <span className="ach-desc">{a.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
