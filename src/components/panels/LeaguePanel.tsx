import { useGame } from '../../game/store';
import { DIVISIONS, LEAGUE_SIZE, PROMOTE_COUNT, RELEGATE_COUNT, botScores, leagueMult, msUntilWeekEnd, rankOf } from '../../game/league';
import { fmt, fmtTime } from '../../game/math';

export function LeaguePanel() {
  const s = useGame((g) => g.s);
  const { league, lastLeagueOutcome } = s;
  const div = DIVISIONS[league.division];
  const bots = botScores(s, league.weekNumber, league.division);
  const rank = rankOf(league.points, bots);
  const standings = [
    { name: 'You', points: league.points, isPlayer: true },
    ...bots.map((points, i) => ({ name: `Player ${i + 1}`, points, isPlayer: false })),
  ].sort((a, b) => b.points - a.points);

  return (
    <div className="panel">
      <div className="panel-intro">
        🏆 Weekly League — your score comes purely from shift performance, not your cash.
        The week ends Sunday at midnight: the top {PROMOTE_COUNT} get promoted, the bottom {RELEGATE_COUNT} get relegated.
      </div>

      <div className="league-head">
        <span className="league-div-emoji">{div.emoji}</span>
        <div>
          <div className="league-div-name">{div.name} League</div>
          <div className="offer-desc">
            +{Math.round((leagueMult(league.division) - 1) * 100)}% permanent income while you're here ·
            {' '}{fmtTime(msUntilWeekEnd())} left
          </div>
        </div>
        <div className="league-rank">
          <span className="league-rank-num">#{rank}</span>
          <span className="offer-desc">/{LEAGUE_SIZE}</span>
        </div>
      </div>

      {lastLeagueOutcome && (
        <div className="offer">
          <div>
            <div className="offer-desc">Last week's result</div>
            <strong>
              {DIVISIONS[lastLeagueOutcome.division].emoji} {DIVISIONS[lastLeagueOutcome.division].name} — rank {lastLeagueOutcome.rank}
              {lastLeagueOutcome.promoted ? ' · promoted!' : lastLeagueOutcome.relegated ? ' · relegated' : ''}
            </strong>
          </div>
          <span className="quest-reward">+{lastLeagueOutcome.gems} 💎</span>
        </div>
      )}

      <h3 className="section">Live standings (estimate for week's end)</h3>
      {standings.map((row, i) => (
        <div key={i} className={`league-row ${row.isPlayer ? 'is-player' : ''}`}>
          <span className="league-row-pos">
            {i + 1 <= PROMOTE_COUNT ? '▲' : i + 1 > LEAGUE_SIZE - RELEGATE_COUNT ? '▼' : '·'} {i + 1}.
          </span>
          <span className="league-row-name">{row.name}</span>
          <span className="league-row-pts">{fmt(row.points)} pt</span>
        </div>
      ))}
    </div>
  );
}
