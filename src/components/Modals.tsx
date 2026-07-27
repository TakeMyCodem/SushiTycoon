import { useState } from 'react';
import { useGame } from '../game/store';
import { fmt, fmtTime } from '../game/math';
import { ads } from '../game/monetization';

/** Visszatérési jutalom — a retention legfontosabb képernyője. */
export function OfflineModal() {
  const offline = useGame((g) => g.offline);
  const claim = useGame((g) => g.claimOffline);
  const noAds = useGame((g) => g.s.noAds);
  const [busy, setBusy] = useState(false);
  if (!offline) return null;

  const double = async () => {
    setBusy(true);
    const ok = await ads.showRewarded('offline_double');
    setBusy(false);
    claim(ok);
  };

  return (
    <div className="overlay">
      <div className="sheet sheet-center">
        <div className="offline-art">🍱</div>
        <h2>The restaurant kept running without you!</h2>
        <p className="muted">Away for {fmtTime(offline.ms)}</p>
        <div className="offline-amount">🪙 {fmt(offline.earned)}</div>
        {offline.ranDry && (
          <p className="offline-warn">
            ⚠️ You ran out of ingredients and a station stopped. Stock up on the
            <b> Management</b> tab — or sign a supplier contract.
          </p>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={double}>
          {busy ? 'Loading ad…' : noAds ? '📺 Double income' : '📺 Watch to DOUBLE it'}
        </button>
        <button className="btn btn-ghost" onClick={() => claim(false)}>
          This is enough
        </button>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useGame((g) => g.toast);
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}
