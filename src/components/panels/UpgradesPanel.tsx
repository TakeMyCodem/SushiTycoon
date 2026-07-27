import { useGame } from '../../game/store';
import { UPGRADES } from '../../game/upgrades';
import { fmt } from '../../game/math';
import { STATION_BY_ID } from '../../game/config';

/**
 * Fejlesztések. Két csoport: globális (drága, mindenre hat) és állomás-specifikus.
 * A megvettek alul, halványan maradnak — látszik a haladás.
 */
export function UpgradesPanel() {
  const s = useGame((g) => g.s);
  const buy = useGame((g) => g.buyUpgrade);

  const visible = UPGRADES.filter((u) => {
    if (s.upgrades.includes(u.id)) return false;
    if (u.target === 'all') return true;
    return s.stations[u.target]?.level >= u.reqLevel;
  });
  // Legolcsóbb elöl: mindig az van a képernyő tetején, ami épp elérhető cél.
  visible.sort((a, b) => a.cost - b.cost);

  const locked = UPGRADES.filter(
    (u) => !s.upgrades.includes(u.id) && u.target !== 'all' && s.stations[u.target]?.level < u.reqLevel,
  ).sort((a, b) => a.cost - b.cost).slice(0, 4);

  return (
    <div className="panel">
      <p className="panel-intro">
        Buying levels is an automatic decision — upgrades aren't. Each one is <b>permanent</b>
        &nbsp;(until the next restaurant), so it's worth thinking about what you save up for.
      </p>

      {visible.length === 0 && <p className="muted">No upgrades available right now — level up your dishes!</p>}

      {visible.map((u) => {
        const can = s.money >= u.cost;
        return (
          <div key={u.id} className={`offer ${u.target === 'all' ? 'is-global' : ''}`}>
            <div className="offer-info">
              <div className="offer-title">
                {u.emoji} {u.name}
                {u.target === 'all' && <span className="badge badge-global">GLOBAL</span>}
              </div>
              <div className="offer-desc">{u.desc}</div>
            </div>
            <button className={`btn btn-buy ${can ? '' : 'is-off'}`} disabled={!can} onClick={() => buy(u.id)}>
              🪙 {fmt(u.cost)}
            </button>
          </div>
        );
      })}

      {locked.length > 0 && (
        <>
          <h3 className="section">Coming Soon</h3>
          {locked.map((u) => (
            <div key={u.id} className="offer is-dim">
              <div className="offer-info">
                <div className="offer-title">🔒 {u.name}</div>
                <div className="offer-desc">
                  From {STATION_BY_ID[u.target]?.name} level {u.reqLevel}
                </div>
              </div>
              <div className="offer-price muted">🪙 {fmt(u.cost)}</div>
            </div>
          ))}
        </>
      )}

      {s.upgrades.length > 0 && (
        <>
          <h3 className="section">Purchased ({s.upgrades.length})</h3>
          <div className="owned-grid">
            {s.upgrades.map((id) => {
              const u = UPGRADES.find((x) => x.id === id);
              return u ? (
                <span key={id} className="owned-chip" title={`${u.name} — ${u.desc}`}>
                  {u.emoji} x{u.mult}
                </span>
              ) : null;
            })}
          </div>
        </>
      )}
    </div>
  );
}
