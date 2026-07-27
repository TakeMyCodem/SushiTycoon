import { useGame } from '../../game/store';
import {
  CHEFS, FRAGMENT_GEM_COST, MAX_SLOTS, RARITY, SCHOOLS, SYNERGY_PCT, chefOfTheDay, chefState,
  describeEffect, fragmentsForNext, slotCost, synergyBonus,
} from '../../game/chefs';
import { dayNumber } from '../../game/management';

/**
 * Séf-gyűjtemény.
 *
 * Nincs "pörgetés" és nincs véletlen doboz: minden séf ismert áron, töredékekből
 * szerezhető, és a játékos választja meg, melyiket gyűjti. A tényleges döntés a
 * **kinevezés** — kevés a hely, és az azonos iskolájú páros extra bónuszt ad.
 */
export function ChefsPanel() {
  const s = useGame((g) => g.s);
  const upgrade = useGame((g) => g.upgradeChef);
  const toggle = useGame((g) => g.toggleChef);
  const buyFrag = useGame((g) => g.buyFragments);
  const buySlot = useGame((g) => g.buySlot);

  const today = chefOfTheDay(dayNumber());
  const synergy = synergyBonus(s);
  const nextSlot = slotCost(s.slots);

  // Megszerzett séfek elöl, azon belül a legerősebbek.
  const order = [...CHEFS].sort((a, b) => {
    const la = chefState(s, a.id).level;
    const lb = chefState(s, b.id).level;
    if ((la > 0) !== (lb > 0)) return lb - la;
    const rank = { legendas: 3, epikus: 2, ritka: 1, gyakori: 0 };
    return rank[b.rarity] - rank[a.rarity];
  });

  return (
    <div className="panel">
      <div className="roster-card">
        <div className="roster-head">
          <span>Kitchen · {s.roster.length}/{s.slots} spots</span>
          {synergy > 0 && <span className="roster-syn">🏯 Synergy +{synergy}%</span>}
        </div>
        <div className="roster-slots">
          {Array.from({ length: s.slots }, (_, i) => {
            const id = s.roster[i];
            const def = CHEFS.find((c) => c.id === id);
            return (
              <button
                key={i}
                className={`slot ${def ? 'is-filled' : ''}`}
                onClick={() => def && toggle(def.id)}
                title={def ? `${def.name} — tap to bench` : 'Empty spot'}
              >
                {def ? (
                  <>
                    <span className="slot-emoji">{def.emoji}</span>
                    <span className="slot-name">{def.name}</span>
                    <span className="slot-school">{SCHOOLS[def.school].emoji}</span>
                  </>
                ) : (
                  <span className="slot-empty">+</span>
                )}
              </button>
            );
          })}
          {s.slots < MAX_SLOTS && nextSlot != null && (
            <button
              className={`slot slot-buy ${s.gems >= nextSlot ? '' : 'is-off'}`}
              onClick={buySlot}
              disabled={s.gems < nextSlot}
            >
              <span className="slot-emoji">🔓</span>
              <span className="slot-name">💎 {nextSlot}</span>
            </button>
          )}
        </div>
        <p className="muted small">
          Two chefs from the same school in your kitchen give <b>+{SYNERGY_PCT}%</b> income.
        </p>
        <p className="muted small">
          🎁 <b>Free fragments</b> only come for today's featured chef — {today.emoji} <b>{today.name}</b> —
          from the daily gift and from finishing a shift with stars. Every other chef: buy fragments
          with 💎 gems below (fixed price, marked "+5" on their card).
        </p>
      </div>

      {order.map((def) => {
        const st = chefState(s, def.id);
        const need = fragmentsForNext(def, st.level);
        const rar = RARITY[def.rarity];
        const owned = st.level > 0;
        const inRoster = s.roster.includes(def.id);
        const canUpgrade = need != null && st.fragments >= need;
        const gemCost = FRAGMENT_GEM_COST[def.rarity] * 5;
        return (
          <div key={def.id} className={`chef ${owned ? 'is-owned' : ''}`} style={{ borderColor: owned ? rar.color : undefined }}>
            <div className="chef-avatar" style={{ background: owned ? `${rar.color}22` : undefined }}>
              <span>{def.emoji}</span>
              {owned && <span className="chef-level">{st.level}</span>}
            </div>
            <div className="chef-body">
              <div className="chef-head">
                <span className="chef-name">{def.name}</span>
                {def.id === today.id && <span className="chef-today">🎁 Today's free fragments</span>}
                <span className="chef-rarity" style={{ color: rar.color }}>
                  {SCHOOLS[def.school].emoji} {rar.label}
                </span>
              </div>
              <div className="chef-effect">{describeEffect(def, st.level)}</div>
              {!owned && <div className="chef-flavor">{def.flavor}</div>}
              {need != null && (
                <div className="frag-bar">
                  <div
                    className="frag-bar-fill"
                    style={{ width: `${Math.min(100, (st.fragments / need) * 100)}%`, background: rar.color }}
                  />
                  <span className="frag-label">{st.fragments} / {need} fragments</span>
                </div>
              )}
              {need == null && <div className="chef-max">MAX LEVEL</div>}
            </div>
            <div className="chef-actions">
              {canUpgrade ? (
                <button className="btn btn-buy" onClick={() => upgrade(def.id)}>
                  {owned ? 'Level Up' : 'Hire'}
                </button>
              ) : (
                need != null && (
                  <button
                    className={`btn btn-buy ${s.gems >= gemCost ? '' : 'is-off'}`}
                    disabled={s.gems < gemCost}
                    onClick={() => buyFrag(def.id, 5)}
                    title="Buy 5 fragments — fixed price, no RNG"
                  >
                    +5
                    <span className="stock-price">💎 {gemCost}</span>
                  </button>
                )
              )}
              {owned && (
                <button className={`btn btn-ghost chef-toggle ${inRoster ? 'is-in' : ''}`} onClick={() => toggle(def.id)}>
                  {inRoster ? 'Bench' : 'Assign'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
