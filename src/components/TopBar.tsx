import { useState } from 'react';
import { useGame } from '../game/store';
import { displayMult, fmt, fmtTime, incomePerSec } from '../game/math';
import { isMuted, toggleMute } from '../game/audio';

export function TopBar({ onOpenShop, onOpenSettings }: { onOpenShop: () => void; onOpenSettings: () => void }) {
  const s = useGame((g) => g.s);
  const [mute, setMute] = useState(isMuted());
  const now = Date.now();
  const perSec = incomePerSec(s, now);
  const active = s.effects.filter((e) => e.until > now);
  const rush = s.event?.kind === 'rush' && s.event.until > now ? s.event : null;

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="money">
          <span className="coin">🪙</span>
          <span className="money-value">{fmt(s.money)}</span>
        </div>
        <div className="persec">
          {fmt(perSec)} / s <span className="mult">· x{fmt(displayMult(s, now))} multiplier</span>
        </div>
      </div>

      <div className="topbar-side">
        <button className="chip chip-gem" onClick={onOpenShop}>
          💎 {fmt(s.gems)} <span className="plus">+</span>
        </button>
        <div className="topbar-row">
          <div className="chip chip-star" title="Michelin stars: a permanent income bonus">
            ⭐ {s.stars}
          </div>
          <button
            className="chip chip-mute"
            onClick={() => setMute(toggleMute())}
            title={mute ? 'Sound on' : 'Sound off'}
          >
            {mute ? '🔇' : '🔊'}
          </button>
          <button className="chip chip-mute" onClick={onOpenSettings} title="Settings">
            ⚙️
          </button>
        </div>
      </div>

      {(active.length > 0 || rush) && (
        <div className="effects">
          {rush && <span className="effect effect-rush">⏰ Rush hour x2 · {fmtTime(rush.until - now)}</span>}
          {active.map((e) => (
            <span key={e.source} className="effect">
              {e.emoji} {e.kind === 'speed' ? 'speed' : 'income'} x{e.mult} · {fmtTime(e.until - now)}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
