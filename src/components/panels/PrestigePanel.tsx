import { useGame } from '../../game/store';
import { PERKS, perkLevel, perkNextCost } from '../../game/perks';
import { fmt, starsFor } from '../../game/math';
import { MIN_PRESTIGE_STARS, STAR_BONUS } from '../../game/config';
import { michelinRankFor, nextMichelinRank } from '../../game/michelin';

/**
 * Prestige + perkbolt egy képernyőn.
 *
 * A központi döntés: az elköltött csillag **nem ad többé +3% bevételt**.
 * Nyers szorzó vs. tartós előny — ez teszi a prestige-t választássá,
 * nem csak egy gombbá.
 */
export function PrestigePanel() {
  const s = useGame((g) => g.s);
  const prestige = useGame((g) => g.prestige);
  const buyPerk = useGame((g) => g.buyPerk);
  const gain = Math.max(0, starsFor(s.lifetime) - s.stars - s.starsSpent);
  const ready = gain >= MIN_PRESTIGE_STARS;
  const careerStars = s.stars + s.starsSpent;
  const rank = michelinRankFor(careerStars, s.stats.prestiges);
  const next = nextMichelinRank(careerStars, s.stats.prestiges);

  return (
    <div className="panel">
      <div className="prestige-card">
        <div className="prestige-hero">{rank.id > 0 ? rank.emoji : '⭐'}</div>
        <div className="offer-desc">
          {rank.name}
          {rank.id > 0 && ` · +${Math.round((rank.mult - 1) * 100)}% permanent income`}
        </div>
        {next && (
          <p className="muted small">
            Next rank ({next.name}): {fmt(careerStars)}/{fmt(next.requireStars)} career stars,{' '}
            {s.stats.prestiges}/{next.requirePrestiges} prestiges
          </p>
        )}
        <div className="stat-row">
          <div className="stat"><span>Free stars</span><b>{s.stars}</b></div>
          <div className="stat"><span>Spent</span><b>{s.starsSpent}</b></div>
          <div className="stat"><span>Income bonus</span><b>+{Math.round(s.stars * STAR_BONUS * 100)}%</b></div>
        </div>
        <p className="muted small">
          A new restaurant resets your money, levels, and upgrades. You keep
          every star, perk, trophy, gem, and quest progress.
        </p>
        <button className="btn btn-primary btn-lg" disabled={!ready} onClick={prestige}>
          {ready ? `Open a new restaurant · +${gain} ⭐` : `Need ${MIN_PRESTIGE_STARS - gain} more stars`}
        </button>
        {!ready && (
          <p className="muted small">
            Stars come from <b>all the money you've ever earned</b> — keep producing
            for the next star, or get a bigger multiplier.
          </p>
        )}
      </div>

      <h3 className="section">Star Perks — kept forever</h3>
      <p className="panel-intro">
        Note: a spent star <b>no longer gives +3% income</b>. That trade-off is the
        point — do you want to be stronger now, or more comfortable long-term?
      </p>

      {PERKS.map((p) => {
        const lvl = perkLevel(s.perks, p.id);
        const cost = perkNextCost(s.perks, p);
        const can = cost != null && s.stars >= cost;
        return (
          <div key={p.id} className={`offer ${lvl > 0 ? 'is-owned' : ''}`}>
            <div className="offer-info">
              <div className="offer-title">
                {p.emoji} {p.name}
                <span className="badge badge-lvl">{lvl}/{p.maxLevel}</span>
              </div>
              {/* 0. szinten a "jelenlegi hatás" mindig nulla lenne — csak azt
                  mutatjuk, mit kapsz, ha megveszed. */}
              <div className="offer-desc">
                {lvl === 0 ? <b>{p.desc(1)}</b> : cost == null ? p.desc(lvl) : <>{p.desc(lvl)} → <b>{p.desc(lvl + 1)}</b></>}
              </div>
            </div>
            {cost == null ? (
              <div className="offer-price muted">MAX</div>
            ) : (
              <button className={`btn btn-buy ${can ? '' : 'is-off'}`} disabled={!can} onClick={() => buyPerk(p.id)}>
                ⭐ {cost}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
