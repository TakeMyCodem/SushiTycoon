import { useEffect, useRef, useState } from 'react';
import { useGame, type BuyMode } from './game/store';
import { STATIONS } from './game/config';
import { TopBar } from './components/TopBar';
import { StationCard } from './components/StationCard';
import { Conveyor } from './components/Conveyor';
import { ShiftLauncher } from './components/ShiftLauncher';
import { ShiftGame } from './components/ShiftGame';
import { OfflineModal, Toast } from './components/Modals';
import { AbilityBar } from './components/AbilityBar';
import { BannerToast, EventLayer } from './components/EventLayer';
import { ManagementPanel } from './components/panels/ManagementPanel';
import { UpgradesPanel } from './components/panels/UpgradesPanel';
import { QuestsPanel } from './components/panels/QuestsPanel';
import { PrestigePanel } from './components/panels/PrestigePanel';
import { ShopPanel } from './components/panels/ShopPanel';
import { LeaguePanel } from './components/panels/LeaguePanel';
import { SettingsModal } from './components/SettingsModal';
import { applyLargeText, isLargeText } from './game/settings';
import { ConsentBanner, needsConsent } from './components/ConsentBanner';
import { Capacitor } from '@capacitor/core';
import { track } from './game/analytics';
import { UPGRADES } from './game/upgrades';
import { starsFor } from './game/math';
import { QUEST_BY_ID } from './game/quests';

const BUY_MODES: BuyMode[] = [1, 10, 100, 'MAX'];

type Tab = 'restaurant' | 'management' | 'upgrades' | 'quests' | 'league' | 'prestige' | 'shop';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'restaurant', icon: '🍣', label: 'Restaurant' },
  { id: 'management', icon: '📋', label: 'Management' },
  { id: 'upgrades', icon: '⚡', label: 'Upgrades' },
  { id: 'quests', icon: '🎯', label: 'Quests' },
  { id: 'league', icon: '🏆', label: 'League' },
  { id: 'prestige', icon: '⭐', label: 'Prestige' },
  { id: 'shop', icon: '🛒', label: 'Shop' },
];

/**
 * Egysoros, állapotfüggő onboarding. Nincs modális tutorial, nincs "Tovább" gomb:
 * a játékos az első 10 másodpercben már játszik. Ez a retention legolcsóbb eszköze.
 */
function Tip() {
  const s = useGame((g) => g.s);
  const first = STATIONS[0];
  const st = s.stations[first.id];

  if (s.lifetime < 4) return <div className="tip">👆 Tap the 🍙 tray to serve!</div>;
  if (st.level < 3) return <div className="tip">Buy more {first.name} levels — more levels, more money.</div>;
  if (!st.manager) {
    return (
      <div className="tip">
        👔 Raise {first.name} to level {10 - st.level} more — {first.managerName.split(',')[0]} will join for free
        and start producing on their own!
      </div>
    );
  }
  if (s.stats.abilitiesUsed === 0) {
    return <div className="tip">💨 Try the ability in the bar below — time it for the rush hour!</div>;
  }
  if (s.stats.shiftsPlayed === 0) {
    return <div className="tip">🧑‍🍳 Start a shift — 60 seconds can bring in up to 40 minutes of production!</div>;
  }
  if (s.stations[STATIONS[1].id].level === 0) {
    return <div className="tip">🍣 Unlock the next dish — it earns a lot more!</div>;
  }
  return null;
}

export default function App() {
  const tick = useGame((g) => g.tick);
  const save = useGame((g) => g.save);
  const buyMode = useGame((g) => g.buyMode);
  const setBuyMode = useGame((g) => g.setBuyMode);
  const s = useGame((g) => g.s);

  const [tab, setTab] = useState<Tab>('restaurant');
  const [shift, setShift] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Natívon a Google UMP (AdMob-on belül) intézi a hozzájárulást — csak weben
  // mutatjuk a saját bannert, lásd components/ConsentBanner.tsx.
  const [consentOpen, setConsentOpen] = useState(!Capacitor.isNativePlatform() && needsConsent());
  const last = useRef(Date.now());

  // Nagyobb betűméret: az utolsó beállítást azonnal alkalmazzuk induláskor is,
  // nem csak a beállítások képernyőn váltáskor.
  useEffect(() => {
    applyLargeText(isLargeText());
  }, []);

  // Fő játékhurok. Szándékosan setInterval + valós időbélyeg, NEM requestAnimationFrame:
  // az rAF háttérben/nem látható tabon teljesen leáll, egy idle játék pedig
  // ilyenkor is termel. A dt-alapú elszámolás miatt a böngésző throttlingja sem
  // veszít el bevételt — a lemaradt időt a következő tick behozza.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(now - last.current, 60_000);
      last.current = now;
      if (dt > 0) tick(dt);
    }, 60);
    return () => clearInterval(id);
  }, [tick]);

  // Mentés: időzítve és minden háttérbe váltáskor (mobilon ez a kritikus pont).
  useEffect(() => {
    track('session_start', {});
    const id = setInterval(save, 5000);
    const onHide = () => save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      save();
    };
  }, [save]);

  // Piros pötty a füleken: van-e ott most tennivaló?
  const affordableUpgrade = UPGRADES.some(
    (u) => !s.upgrades.includes(u.id) && s.money >= u.cost &&
      (u.target === 'all' || s.stations[u.target]?.level >= u.reqLevel),
  );
  const questDone = s.activeQuests.some((q) => {
    const def = QUEST_BY_ID[q];
    return def && def.progress(s) >= def.target;
  });
  const dailyReady = new Date(s.lastDaily).toDateString() !== new Date().toDateString();
  const prestigeReady = starsFor(s.lifetime) - s.stars - s.starsSpent >= 10;
  // Kifogyott alapanyag: ez a legdrágább figyelmen kívül hagyható hiba a játékban,
  // ezért mindig kapjon jelzést.
  const stockOut = s.managementUnlocked && STATIONS.some(
    (d) => s.stations[d.id].manager && (s.stock[d.id] ?? 0) <= 0,
  );
  const alerts: Record<Tab, boolean> = {
    restaurant: false,
    management: stockOut,
    upgrades: affordableUpgrade,
    quests: questDone || dailyReady,
    league: false,
    prestige: prestigeReady || s.stars > 0,
    shop: false,
  };

  return (
    <div className="app">
      <TopBar onOpenShop={() => setTab('shop')} onOpenSettings={() => setSettingsOpen(true)} />

      {tab === 'restaurant' && (
        <>
          <Conveyor />
          <ShiftLauncher onStart={() => setShift(true)} />
          <div className="buymode">
            {BUY_MODES.map((m) => (
              <button key={String(m)} className={buyMode === m ? 'active' : ''} onClick={() => setBuyMode(m)}>
                {m === 'MAX' ? 'MAX' : `x${m}`}
              </button>
            ))}
          </div>
          <main className="stations">
            {STATIONS.map((def, i) => (
              <StationCard key={def.id} def={def} index={i} />
            ))}
          </main>
          <Tip />
        </>
      )}

      {tab === 'management' && <ManagementPanel />}
      {tab === 'upgrades' && <UpgradesPanel />}
      {tab === 'quests' && <QuestsPanel />}
      {tab === 'league' && <LeaguePanel />}
      {tab === 'prestige' && <PrestigePanel />}
      {tab === 'shop' && <ShopPanel />}

      <AbilityBar />

      <nav className="bottombar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'is-active' : ''} ${alerts[t.id] ? 'has-alert' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-ico">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {shift && <ShiftGame onClose={() => setShift(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {consentOpen && <ConsentBanner onDone={() => setConsentOpen(false)} />}
      <EventLayer />
      <BannerToast />
      <OfflineModal />
      <Toast />
    </div>
  );
}
