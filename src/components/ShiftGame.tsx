import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { STATION_BY_ID } from '../game/config';
import {
  KIND_EMOJI, SHIFT_DURATION_MS, comboMult, finishShift, newShift, serveDish, shiftDishes,
  shiftStars, stepShift, type ShiftResult, type ShiftState,
} from '../game/shift';
import { fmt, fmtTime, incomePerSec } from '../game/math';
import { sfx } from '../game/audio';
import { ads } from '../game/monetization';
import { chefBonus } from '../game/chefs';

type Phase = 'intro' | 'playing' | 'result';

/**
 * A műszak teljes képernyős minijáték. Saját hurokkal fut (25 ms), függetlenül
 * az idle motortól — az a háttérben tovább termel, ahogy kell.
 */
export function ShiftGame({ onClose }: { onClose: () => void }) {
  const s = useGame((g) => g.s);
  const award = useGame((g) => g.awardShift);
  const startCooldown = useGame((g) => g.startShiftCooldown);

  const [phase, setPhase] = useState<Phase>('intro');
  const [st, setSt] = useState<ShiftState>(newShift);
  const [result, setResult] = useState<ShiftResult | null>(null);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [pops, setPops] = useState<{ id: number; gained: number }[]>([]);
  const popId = useRef(0);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const dishes = useRef<string[]>(shiftDishes(s));
  const stRef = useRef(st);
  stRef.current = st;
  const rushRef = useRef(false);
  // A séf-bónuszt a műszak indulásakor rögzítjük, hogy közben ne változzon.
  const pointsMult = useRef(1);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const cur = stRef.current;
      if (cur.elapsed >= SHIFT_DURATION_MS) {
        const r = finishShift(cur, rushRef.current, pointsMult.current);
        setResult(r);
        setPhase('result');
        startCooldown();
        sfx.quest();
        return;
      }
      const { state, lostNow } = stepShift(cur, 25, dishes.current);
      if (lostNow > 0) {
        setFlash('bad');
        sfx.tap();
        setTimeout(() => setFlash(null), 220);
      }
      setSt(state);
    }, 25);
    return () => clearInterval(id);
  }, [phase, startCooldown]);

  const begin = () => {
    dishes.current = shiftDishes(s);
    rushRef.current = s.event?.kind === 'rush' && s.event.until > Date.now();
    pointsMult.current = 1 + chefBonus(s, 'shift', 'global') / 100;
    setSt(newShift());
    setPhase('playing');
    sfx.rush();
  };

  const onServe = (dish: string) => {
    const { state, ok, gained } = serveDish(stRef.current, dish);
    setSt(state);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 180);
    if (gained > 0 || !ok) {
      const id = popId.current++;
      setPops((p) => [...p.slice(-4), { id, gained }]);
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 800);
    }
    if (ok) sfx.buy();
    else sfx.tap();
  };

  const claim = async (doubled: boolean) => {
    if (!result || claimed) return;
    if (doubled) {
      setBusy(true);
      const ok = await ads.showRewarded('shift_double');
      setBusy(false);
      if (!ok) return;
    }
    setClaimed(true);
    award(result, doubled);
    onClose();
  };

  const left = Math.max(0, SHIFT_DURATION_MS - st.elapsed);
  const perSec = incomePerSec(s);

  return (
    <div className="shift-overlay">
      {phase === 'intro' && (
        <div className="shift-intro">
          <div className="shift-hero">🧑‍🍳</div>
          <h2>Shift</h2>
          <p className="muted">
            60 seconds. Guests tell you what they want — tap the right
            dish before their patience runs out.
          </p>
          <ul className="shift-rules">
            <li>✅ Accurate serving → grows your <b>combo</b> (max x5)</li>
            <li>❌ Wrong dish or a lost guest → combo resets to zero</li>
            <li>🎩 <b>VIP</b>: triple points, but gets bored fast — take them first</li>
            <li>👨‍👩‍👧 <b>Big order</b>: two servings of the same dish, two taps</li>
            <li>⏰ <b>Double</b> reward during rush hour</li>
          </ul>
          {s.bestShift > 0 && <p className="shift-best">Your record so far: <b>{Math.round(s.bestShift * 10) / 10} points</b></p>}
          <button className="btn btn-primary btn-lg" onClick={begin}>Start</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      )}

      {phase === 'playing' && (
        <div className={`shift-play ${flash ? `flash-${flash}` : ''}`}>
          <div className="shift-hud">
            <div className="shift-timer">
              <div className="shift-timer-fill" style={{ width: `${(left / SHIFT_DURATION_MS) * 100}%` }} />
              <span>{Math.ceil(left / 1000)}</span>
            </div>
            <div className="shift-score">
              <b>{Math.round(st.points * 10) / 10}</b> points
              {st.combo > 0 && <span className="shift-combo">🔥 {st.combo} · x{comboMult(st.combo)}</span>}
            </div>
          </div>

          <div className="shift-queue">
            {st.queue.map((c) => {
              const age = st.elapsed - c.bornAt;
              const patience = 1 - age / c.patienceMs;
              const face = c.kind === 'normal'
                ? (patience < 0.3 ? '😠' : patience < 0.6 ? '😐' : '🙂')
                : KIND_EMOJI[c.kind];
              return (
                <div key={c.id} className={`customer is-${c.kind} ${patience < 0.3 ? 'is-angry' : ''}`}>
                  <span className="customer-face">{face}</span>
                  <span className="customer-order">
                    {STATION_BY_ID[c.dish]?.emoji}
                    {c.remaining > 1 && <b className="customer-qty">x{c.remaining}</b>}
                  </span>
                  {c.kind === 'vip' && <span className="customer-tag">VIP x3</span>}
                  <div className="customer-bar">
                    <div className="customer-bar-fill" style={{ width: `${Math.max(0, patience) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {st.queue.length === 0 && <div className="shift-empty">Guests incoming…</div>}
          </div>

          <div className="shift-pops">
            {pops.map((p) => (
              <span key={p.id} className={p.gained > 0 ? 'shift-pop' : 'shift-pop is-miss'}>
                {p.gained > 0 ? `+${Math.round(p.gained * 10) / 10}` : 'Oops!'}
              </span>
            ))}
          </div>

          <div className="shift-dishes">
            {dishes.current.map((id) => (
              <button key={id} className="shift-dish" onClick={() => onServe(id)}>
                {STATION_BY_ID[id]?.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="shift-intro">
          <div className="shift-stars">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < shiftStars(result) ? 'star on' : 'star'}>⭐</span>
            ))}
          </div>
          <h2>Shift Complete</h2>
          <div className="shift-stats">
            <div className="stat"><span>Served</span><b>{result.served}</b></div>
            <div className="stat"><span>Accuracy</span><b>{Math.round(result.accuracy * 100)}%</b></div>
            <div className="stat"><span>Best combo</span><b>{result.bestCombo}</b></div>
          </div>
          <p className="muted small">
            {result.points} points{result.rushBonus && ' · rush hour x2'} → {fmtTime(result.rewardSeconds * 1000)} of production
          </p>
          <div className="offline-amount">🪙 {fmt(perSec * result.rewardSeconds)}</div>
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => claim(true)}>
            {busy ? 'Loading ad…' : '📺 Watch and DOUBLE'}
          </button>
          <button className="btn btn-ghost" onClick={() => claim(false)}>I'll take this</button>
        </div>
      )}
    </div>
  );
}
