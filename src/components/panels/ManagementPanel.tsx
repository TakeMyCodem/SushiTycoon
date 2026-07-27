import { useState } from 'react';
import { useGame } from '../../game/store';
import { STATIONS } from '../../game/config';
import { ChefsPanel } from './ChefsPanel';
import {
  CONTRACT_REFILL_TO_HOURS, MANAGEMENT_UNLOCK_STATIONS, PRICE_TIERS, STOCK_PACKS, bestTierFor,
  contractCost, demandFor, ingredientPrice, marketFactor, netRate, priceOf, reputationMult,
  stockCostForHours, stockDurationMs,
} from '../../game/management';
import { fmt, fmtTime } from '../../game/math';

type Section = 'chefs' | 'pricing' | 'stock';

/**
 * A "Vezetés" fül három szekcióra bomlik. Szándékosan nem lett belőle három
 * külön alsó fül: hat ikonnál több már nem fér ki olvashatóan egy telefonon.
 */
export function ManagementPanel() {
  const s = useGame((g) => g.s);
  const setTier = useGame((g) => g.setPriceTier);
  const buyStock = useGame((g) => g.buyStock);
  const buyContract = useGame((g) => g.buyContract);
  const [section, setSection] = useState<Section>('chefs');

  const nav = (
    <div className="subtabs">
      {([
        ['chefs', '👨‍🍳 Chefs'],
        ['pricing', '💴 Pricing'],
        ['stock', '📦 Ingredients'],
      ] as [Section, string][]).map(([id, label]) => (
        <button key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}>
          {label}
        </button>
      ))}
    </div>
  );

  // A séfek a menedzsment-réteg nélkül is elérhetők: a gyűjtemény az első
  // perctől motivál, nem kell hozzá három megnyitott fogás.
  if (section === 'chefs') {
    return (
      <div className="panel-wrap">
        {nav}
        <ChefsPanel />
      </div>
    );
  }

  if (!s.managementUnlocked) {
    const open = STATIONS.filter((d) => s.stations[d.id].level > 0).length;
    return (
      <div className="panel-wrap">
        {nav}
        <div className="panel">
          <div className="locked-card">
            <div className="prestige-hero">📋</div>
            <h3>Restaurant management locked</h3>
            <p className="muted">
              Unlock {MANAGEMENT_UNLOCK_STATIONS} dishes ({open}/{MANAGEMENT_UNLOCK_STATIONS})
              to open up pricing, reputation, and ingredient management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const price = priceOf(s);
  const demand = demandFor(price, s.reputation);
  const best = bestTierFor(s.reputation);
  const repMult = reputationMult(s.reputation);

  if (section === 'pricing') {
    return (
      <div className="panel-wrap">
        {nav}
        <div className="panel">
      {/* ---------- Hírnév ---------- */}
      <h3 className="section">Reputation</h3>
      <div className="rep-card">
        <div className="rep-value">{Math.round(s.reputation)}<span>/100</span></div>
        <div className="rep-bar">
          <div className="rep-bar-fill" style={{ width: `${s.reputation}%` }} />
        </div>
        <p className="muted small">
          Reputation decides how much you can charge. It rises from good shifts and VIP
          guests, and drops when a station runs out of ingredients.
          Current income bonus: <b>{repMult >= 1 ? '+' : ''}{Math.round((repMult - 1) * 100)}%</b>
        </p>
      </div>

      {/* ---------- Árazás ---------- */}
      <h3 className="section">Menu Pricing</h3>
      <p className="panel-intro">
        Higher price = more money per serving, but fewer guests. The optimum moves
        with your reputation — as it grows, <b>raise your prices</b>, or you're leaving money on the table.
      </p>
      <div className="tiers">
        {PRICE_TIERS.map((t) => (
          <button
            key={t.id}
            className={`tier ${s.priceTier === t.id ? 'is-active' : ''} ${best === t.id ? 'is-best' : ''}`}
            onClick={() => setTier(t.id)}
          >
            <span className="tier-emoji">{t.emoji}</span>
            <span className="tier-name">{t.name}</span>
            <span className="tier-net">{netRate(t.price, s.reputation).toFixed(2)}x</span>
            {best === t.id && <span className="tier-badge">RECOMMENDED</span>}
          </button>
        ))}
      </div>
      <div className="stat-row">
        <div className="stat"><span>Price/serving</span><b>x{price.toFixed(2)}</b></div>
        <div className="stat"><span>Guest flow</span><b>x{demand.toFixed(2)}</b></div>
        <div className="stat"><span>Net effect</span><b>x{(price * demand).toFixed(2)}</b></div>
      </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-wrap">
      {nav}
      <div className="panel">
      {/* ---------- Alapanyag ---------- */}
      <h3 className="section">Ingredient Sourcing</h3>
      <p className="panel-intro">
        Market prices change daily. Buying in bulk on a cheap day saves a lot —
        a supplier contract is convenient, but charges a 15% markup.
      </p>

      {STATIONS.filter((d) => s.stations[d.id].level > 0).map((def) => {
        const qty = s.stock[def.id] ?? 0;
        const factor = marketFactor(def.id);
        const unit = ingredientPrice(s, def.id);
        const left = stockDurationMs(s, def.id);
        const hasContract = s.contracts.includes(def.id);
        const cheap = factor < 0.9;
        const contract = contractCost(s, def.id);
        return (
          <div key={def.id} className={`stock-row ${qty <= 0 ? 'is-empty' : ''}`}>
            <div className="stock-head">
              <span className="stock-name">{def.emoji} {def.name}</span>
              <span className={`stock-market ${cheap ? 'is-cheap' : factor > 1.1 ? 'is-pricy' : ''}`}>
                {cheap ? '📉 cheap' : factor > 1.1 ? '📈 pricy' : '➖ average'} · {fmt(unit)}/serving
              </span>
            </div>
            <div className="stock-info">
              <b>{fmt(qty)} servings</b>
              {isFinite(left) && qty > 0 && <span className="muted"> · lasts {fmtTime(left)}</span>}
              {qty <= 0 && <span className="stock-warn"> · OUT OF STOCK, station stopped!</span>}
              {hasContract && <span className="tag tag-auto">CONTRACT</span>}
            </div>
            <div className="stock-buttons">
              {STOCK_PACKS.map((h) => {
                const cost = stockCostForHours(s, def.id, h);
                return (
                  <button
                    key={h}
                    className={`btn btn-buy ${s.money >= cost ? '' : 'is-off'}`}
                    disabled={s.money < cost}
                    onClick={() => buyStock(def.id, h)}
                  >
                    +{h}h{h >= 6 && <em className="bulk">-{h >= 24 ? 20 : 10}%</em>}
                    <span className="stock-price">🪙 {fmt(cost)}</span>
                  </button>
                );
              })}
              {!hasContract && (
                <button
                  className={`btn btn-buy contract ${s.money >= contract ? '' : 'is-off'}`}
                  disabled={s.money < contract}
                  onClick={() => buyContract(def.id)}
                  title={`Automatically refills to ${CONTRACT_REFILL_TO_HOURS} hours of stock, with a 15% markup`}
                >
                  📦
                  <span className="stock-price">🪙 {fmt(contract)}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
