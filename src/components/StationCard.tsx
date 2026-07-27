import { useGame } from '../game/store';
import type { StationDef } from '../game/types';
import {
  costFor, cycleIncome, cycleMs, fmt, fmtTime, managerCost, maxAffordable, nextMilestone,
} from '../game/math';
import { STATIONS } from '../game/config';
import { ABILITY_BY_STATION } from '../game/abilities';
import { COMBO_BONUS_PCT, hasCombo } from '../game/chefs';

export function StationCard({ def, index }: { def: StationDef; index: number }) {
  const s = useGame((g) => g.s);
  const buyMode = useGame((g) => g.buyMode);
  const buy = useGame((g) => g.buy);
  const hire = useGame((g) => g.hireManager);
  const tap = useGame((g) => g.tapStation);
  const pops = useGame((g) => g.pops);

  const st = s.stations[def.id];
  const locked = st.level === 0;
  const n = buyMode === 'MAX' ? Math.max(1, maxAffordable(def, st.level, s.money)) : buyMode;
  const cost = costFor(def, st.level, locked ? 1 : n);
  const canBuy = s.money >= cost;
  const perCycle = cycleIncome(s, def);
  const dur = cycleMs(s, def, st.level);
  const ms = nextMilestone(st.level);
  const pop = pops.filter((p) => p.stationId === def.id).slice(-1)[0];
  const mgrCost = managerCost(s, def);
  const ability = ABILITY_BY_STATION[def.id];
  const combo = !locked && hasCombo(s, def.id);

  // Zárolt állomás: csak az előző megnyitása után mutatjuk, hogy legyen mit várni.
  const prevId = index > 0 ? STATIONS[index - 1].id : null;
  const teaser = locked && prevId != null && s.stations[prevId].level === 0;
  if (teaser) {
    return (
      <div className="station station-hidden">
        <div className="station-icon">❓</div>
        <div className="station-body">
          <div className="station-name">New dish coming soon…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`station ${locked ? 'is-locked' : ''} ${st.manager ? 'is-auto' : ''}`}>
      <button
        className="station-icon"
        onClick={() => tap(def.id)}
        disabled={locked || st.manager}
        title={st.manager ? 'Automatic' : 'Tap to serve'}
      >
        <span className={st.running && !st.manager ? 'cooking' : ''}>{def.emoji}</span>
        {!locked && <span className="station-level">{st.level}</span>}
        {pop && <span key={pop.id} className="pop">+{fmt(pop.amount)}</span>}
      </button>

      <div className="station-body">
        <div className="station-head">
          <span className="station-name">{def.name}</span>
          {combo && (
            <span className="tag tag-combo" title={`A chef in your kitchen has this as their signature dish: +${COMBO_BONUS_PCT}% income`}>
              🔥 Combo
            </span>
          )}
          {st.manager ? (
            <span className="tag tag-auto">AUTO</span>
          ) : (
            !locked && (
              <button
                className="tag tag-hire"
                disabled={s.money < mgrCost}
                onClick={() => hire(def.id)}
                title={ability ? `Unlocks with the manager: ${ability.name}` : 'Automation'}
              >
                👔 {fmt(mgrCost)}{ability ? ` ${ability.emoji}` : ''}
              </button>
            )
          )}
        </div>

        <div className="progress">
          <div className="progress-fill" style={{ width: `${(locked ? 0 : st.progress) * 100}%` }} />
          <span className="progress-label">
            {locked ? 'Locked' : `${fmt(perCycle)} / ${fmtTime(dur)}`}
          </span>
        </div>

        {!locked && ms && (
          <div className="milestone">
            {ms - st.level} levels to the next x2 (at {ms})
          </div>
        )}
      </div>

      <button className={`buy ${canBuy ? 'can' : ''}`} disabled={!canBuy} onClick={() => buy(def.id)}>
        <span className="buy-label">{locked ? 'UNLOCK' : `x${buyMode === 'MAX' ? n : buyMode}`}</span>
        <span className="buy-cost">🪙 {fmt(cost)}</span>
      </button>
    </div>
  );
}
