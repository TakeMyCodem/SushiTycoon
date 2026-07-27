import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { STATIONS } from '../game/config';

const GUEST_FACES = ['🧑', '👩', '🧔', '👵', '👨', '🧓', '👧', '🧑‍🦰'];

/**
 * Futószalag + vendégek. Semmi játékmechanikai szerepe nincs — és pont ezért fontos.
 *
 * Enélkül a képernyő progress bar-ok listája: egy táblázat. Ettől lesz belőle
 * *étterem*, ahol történik valami. A vendégek a kiszolgált fogásokra reagálnak,
 * a szalag pedig a megnyitott fogásokat hordja — a haladás így vizuálisan is látszik.
 */
export function Conveyor() {
  const stations = useGame((g) => g.s.stations);
  const pops = useGame((g) => g.pops);
  const [happy, setHappy] = useState<number | null>(null);
  const lastPop = useRef(0);

  const unlocked = STATIONS.filter((d) => stations[d.id].level > 0);
  const guestCount = Math.min(6, Math.max(2, unlocked.length));

  // Ha kiszolgáltunk valamit, egy véletlen vendég megörül.
  useEffect(() => {
    const latest = pops[pops.length - 1]?.id ?? 0;
    if (latest === lastPop.current) return;
    lastPop.current = latest;
    setHappy(Math.floor(Math.random() * guestCount));
    const t = setTimeout(() => setHappy(null), 700);
    return () => clearTimeout(t);
  }, [pops, guestCount]);

  const belt = unlocked.length > 0 ? unlocked : [STATIONS[0]];

  return (
    <div className="scene">
      <div className="guests">
        {Array.from({ length: guestCount }, (_, i) => (
          <span key={i} className={`guest ${happy === i ? 'is-happy' : ''}`}>
            {GUEST_FACES[i % GUEST_FACES.length]}
            {happy === i && <span className="guest-bubble">😋</span>}
          </span>
        ))}
      </div>
      <div className="belt">
        {/* Kétszer soroljuk fel a fogásokat, hogy a végtelenített csúszás varrat nélküli legyen. */}
        <div className="belt-track">
          {[...belt, ...belt, ...belt, ...belt].map((d, i) => (
            <span key={i} className="belt-item">{d.emoji}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
