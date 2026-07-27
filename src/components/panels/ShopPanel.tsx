import { useState } from 'react';
import { GEM_PRICES, useGame } from '../../game/store';
import { IAP_CATALOG, ads, iap } from '../../game/monetization';
import { AD_BOOST_MULT } from '../../game/config';

export function ShopPanel() {
  const grant = useGame((g) => g.grantIap);
  const spend = useGame((g) => g.spendGems);
  const watchAdBoost = useGame((g) => g.watchAdBoost);
  const gems = useGame((g) => g.s.gems);
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (sku: string) => {
    setBusy(sku);
    const ok = await iap.purchase(sku);
    setBusy(null);
    if (ok) grant(sku);
  };

  const watchAd = async () => {
    setBusy('ad');
    const ok = await ads.showRewarded('income_boost');
    setBusy(null);
    if (ok) watchAdBoost();
  };

  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const restore = async () => {
    setBusy('restore');
    const skus = await iap.restore();
    setBusy(null);
    skus.forEach(grant);
    setRestoreMsg(
      skus.length > 0 ? `${skus.length} purchases restored.` : 'No previous purchases found for this account.',
    );
  };

  return (
    <div className="panel">
      <h3 className="section">Free</h3>
      <div className="offer is-best">
        <div className="offer-info">
          <div className="offer-title">📺 x{AD_BOOST_MULT} income · 4 minutes</div>
          <div className="offer-desc">Watch a short video</div>
        </div>
        <button className="btn btn-buy" disabled={busy === 'ad'} onClick={watchAd}>
          {busy === 'ad' ? '…' : 'Start'}
        </button>
      </div>

      <h3 className="section">Spend your 💎 {gems} gems</h3>
      <div className="offer">
        <div className="offer-info">
          <div className="offer-title">⏩ 2 hours of production</div>
          <div className="offer-desc">Instant cash based on your current income</div>
        </div>
        <button className="btn btn-buy" onClick={() => spend('cash')}>💎 {GEM_PRICES.cash}</button>
      </div>
      <div className="offer">
        <div className="offer-info">
          <div className="offer-title">🔥 x3 income · 12 minutes</div>
          <div className="offer-desc">No ad, instantly</div>
        </div>
        <button className="btn btn-buy" onClick={() => spend('boost')}>💎 {GEM_PRICES.boost}</button>
      </div>

      <h3 className="section">Gems & Packs</h3>
      <p className="muted small">Developer mode: purchases are simulated, no real payment happens.</p>
      {IAP_CATALOG.map((p) => (
        <div key={p.sku} className={`offer ${p.best ? 'is-best' : ''}`}>
          <div className="offer-info">
            <div className="offer-title">
              {p.title} {p.badge && <span className="badge">{p.badge}</span>}
            </div>
            <div className="offer-desc">{p.desc}</div>
          </div>
          <button className="btn btn-buy" disabled={busy === p.sku} onClick={() => buy(p.sku)}>
            {busy === p.sku ? '…' : p.price}
          </button>
        </div>
      ))}

      {/* Az App Store megköveteli — a nem-fogyó vásárlásokat (reklámmentesség,
          VIP) új eszközön vagy törlés után is vissza tudja adni a bolt. */}
      <button className="btn btn-ghost" style={{ marginTop: 10 }} disabled={busy === 'restore'} onClick={restore}>
        {busy === 'restore' ? 'Checking…' : '↺ Restore purchases'}
      </button>
      {restoreMsg && <p className="muted small" style={{ textAlign: 'center' }}>{restoreMsg}</p>}
    </div>
  );
}
