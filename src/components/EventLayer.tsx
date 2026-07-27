import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { fmtTime } from '../game/math';

/**
 * VIP vendég: véletlen helyen felbukkanó, korlátozott ideig elkapható jutalom.
 * Ez az egyetlen mechanika, ami *megköveteli* a jelenlétet — és pont ezért
 * hozza vissza a játékost. Ha lemarad róla, nincs büntetés, csak elmaradt haszon.
 */
export function EventLayer() {
  const event = useGame((g) => g.s.event);
  const catchVip = useGame((g) => g.catchVip);
  const [pos, setPos] = useState({ x: 50, y: 60 });
  const now = Date.now();

  // Minden új VIP más helyre ül le.
  useEffect(() => {
    if (event?.kind === 'vip') {
      setPos({ x: 12 + Math.random() * 70, y: 30 + Math.random() * 45 });
    }
  }, [event?.kind, event?.until]);

  if (!event || event.until <= now) return null;

  if (event.kind !== 'vip') return null;

  return (
    <button
      className="vip-guest"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onClick={catchVip}
      title="VIP guest — tap them!"
    >
      🎩
      <span className="vip-timer">{fmtTime(event.until - now)}</span>
    </button>
  );
}

/** Nagy, feltűnő visszajelzés mérföldköveknél (küldetés, trófea, új fogás). */
export function BannerToast() {
  const banner = useGame((g) => g.banner);
  if (!banner) return null;
  return (
    <div className="big-banner">
      <span className="big-banner-emoji">{banner.emoji}</span>
      <div>
        <div className="big-banner-title">{banner.title}</div>
        <div className="big-banner-text">{banner.text}</div>
      </div>
    </div>
  );
}
