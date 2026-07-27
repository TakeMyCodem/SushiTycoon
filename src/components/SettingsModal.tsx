import { useRef, useState } from 'react';
import { isMuted, isVibeOn, toggleMute, toggleVibe } from '../game/audio';
import { isLargeText, toggleLargeText, exportSave, importSave } from '../game/settings';
import { SAVE_KEY } from '../game/config';
import { useGame } from '../game/store';

/**
 * Beállítások képernyő (Nap 4). Nem modális tutorial-kényszer, csak a
 * kontroll a játékos kezébe: hang, rezgés, betűméret, mentés ki-/beviteli
 * kontrollja, és pár mondat arról, hogy nincs fiók és nincs szerver.
 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [mute, setMute] = useState(isMuted());
  const [vibe, setVibe] = useState(isVibeOn());
  const [large, setLarge] = useState(isLargeText());
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hardReset = useGame((g) => g.hardReset);

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importSave(SAVE_KEY, String(reader.result ?? ''));
      setImportMsg(ok ? 'Loaded — takes effect after restart.' : 'That file is not a valid save.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>⚙️ Settings</h2>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-name">🔊 Sound</div>
            <div className="offer-desc">Effects for taps, purchases, and rewards</div>
          </div>
          <button className={`toggle ${!mute ? 'is-on' : ''}`} onClick={() => setMute(toggleMute())}>
            {mute ? 'Off' : 'On'}
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-name">📳 Vibration</div>
            <div className="offer-desc">Separate from sound — works on phones</div>
          </div>
          <button className={`toggle ${vibe ? 'is-on' : ''}`} onClick={() => setVibe(toggleVibe())}>
            {vibe ? 'On' : 'Off'}
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-name">🔠 Larger Text</div>
            <div className="offer-desc">Accessibility — scales up the whole interface</div>
          </div>
          <button className={`toggle ${large ? 'is-on' : ''}`} onClick={() => setLarge(toggleLargeText())}>
            {large ? 'On' : 'Off'}
          </button>
        </div>

        <h3 className="section">Save</h3>
        <p className="offer-desc" style={{ marginBottom: 8 }}>
          Your save only lives on this phone/browser. Download it if you're
          switching devices, or before clearing your browser data.
        </p>
        <button className="btn btn-buy" onClick={() => exportSave(SAVE_KEY)}>⬇️ Download save</button>
        <button className="btn btn-buy" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
          ⬆️ Restore save
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
        />
        {importMsg && <p className="offer-desc" style={{ marginTop: 6 }}>{importMsg}</p>}

        <h3 className="section">Privacy</h3>
        <p className="offer-desc">
          No account, no server: all data stays on your own device. In-game
          ad and payment providers (once live) will have their own privacy
          policies.
        </p>
        <a className="btn btn-ghost" href="./privacy.html" target="_blank" rel="noopener">
          📄 Full privacy policy
        </a>

        <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => {
          if (confirm('Are you sure you want to delete your entire save? This cannot be undone.')) hardReset();
        }}>
          🗑️ Delete save (fresh start)
        </button>
      </div>
    </div>
  );
}
