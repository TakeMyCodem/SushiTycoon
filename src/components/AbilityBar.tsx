import { useGame } from '../game/store';
import { ABILITIES } from '../game/abilities';
import { abilityCooldown, fmtTime } from '../game/math';

/**
 * Képességsáv. Csak a felvett managerek képességei jelennek meg —
 * így minden manager-felvétel új játékmechanikát nyit, nem csak automatizálást.
 */
export function AbilityBar() {
  const s = useGame((g) => g.s);
  const use = useGame((g) => g.useAbility);
  const now = Date.now();

  const owned = ABILITIES.filter((a) => s.stations[a.stationId]?.manager);
  if (owned.length === 0) return null;

  return (
    <div className="abilitybar">
      {owned.map((a) => {
        const readyAt = s.abilityReady[a.id] ?? 0;
        const left = readyAt - now;
        const ready = left <= 0;
        const total = abilityCooldown(s, a.cooldownMs);
        const pct = ready ? 0 : (left / total) * 100;
        return (
          <button
            key={a.id}
            className={`ability ${ready ? 'is-ready' : ''}`}
            onClick={() => use(a.id)}
            disabled={!ready}
            title={`${a.name} — ${a.desc}`}
          >
            <span className="ability-cd" style={{ height: `${pct}%` }} />
            <span className="ability-emoji">{a.emoji}</span>
            <span className="ability-label">{ready ? a.short : fmtTime(left)}</span>
          </button>
        );
      })}
    </div>
  );
}
