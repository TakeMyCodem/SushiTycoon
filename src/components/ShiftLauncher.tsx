import { useState } from 'react';
import { useGame } from '../game/store';
import { SHIFT_SKIP_GEMS } from '../game/shift';
import { fmtTime } from '../game/math';
import { ads } from '../game/monetization';

/**
 * A műszak indítója az étterem-fülön.
 *
 * A cooldown itt nem büntetés, hanem a monetizáció horgonya: aki most akar
 * játszani, vagy megnéz egy reklámot, vagy gyémántot költ. Mindkettő önkéntes,
 * és a játékos pontosan tudja, mit kap érte.
 */
export function ShiftLauncher({ onStart }: { onStart: () => void }) {
  const s = useGame((g) => g.s);
  const clearCd = useGame((g) => g.clearShiftCooldown);
  const skipCd = useGame((g) => g.skipShiftCooldown);
  const [busy, setBusy] = useState(false);

  const left = s.shiftReadyAt - Date.now();
  const ready = left <= 0;

  const watchAd = async () => {
    setBusy(true);
    const ok = await ads.showRewarded('skip_cooldown');
    setBusy(false);
    if (ok) clearCd();
  };

  return (
    <div className={`shift-card ${ready ? 'is-ready' : ''}`}>
      <div className="shift-card-main">
        <span className="shift-card-icon">🧑‍🍳</span>
        <div>
          <div className="shift-card-title">Shift</div>
          <div className="offer-desc">
            {ready
              ? '60 seconds of serving — up to 40 minutes of production'
              : `Next shift: ${fmtTime(left)}`}
          </div>
        </div>
      </div>

      {ready ? (
        <button className="btn btn-primary btn-inline" onClick={onStart}>Start</button>
      ) : (
        <div className="shift-card-actions">
          <button className="btn btn-buy" disabled={busy} onClick={watchAd}>
            {busy ? '…' : '📺'}
          </button>
          <button className="btn btn-buy" onClick={skipCd}>💎 {SHIFT_SKIP_GEMS}</button>
        </div>
      )}
    </div>
  );
}
