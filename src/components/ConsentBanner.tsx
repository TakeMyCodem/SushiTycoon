import { useState } from 'react';

/**
 * GDPR hozzájárulás-kezelő — webes/dev nézet.
 *
 * Natív platformon ezt a Google UMP intézi (lásd game/monetization.ts
 * `ensureAdmob` — az AdMob csomag beépített hozzájárulási formája). Weben
 * viszont nincs AdMob SDK, tehát itt egy saját, minimális bannerrel kérjük
 * el a személyre szabott reklám engedélyét, mielőtt bármilyen reklám-SDK
 * (pl. AdSense) betöltene bármit.
 */
const KEY = 'sushi-ad-consent';

export function needsConsent(): boolean {
  return localStorage.getItem(KEY) === null;
}

export function ConsentBanner({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  const choose = (personalized: boolean) => {
    setBusy(true);
    localStorage.setItem(KEY, personalized ? 'personalized' : 'basic');
    onDone();
  };

  return (
    <div className="overlay">
      <div className="sheet sheet-center">
        <div className="offline-art">🍪</div>
        <h2>Ad Consent</h2>
        <p className="muted small">
          The game stays free, kept alive by ads and optional purchases.
          Allow personalized ads? You'll see the same number of ads either way,
          just less relevant ones without it.
        </p>
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => choose(true)}>
          Allow personalized ads
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => choose(false)}>
          Basic ads only
        </button>
      </div>
    </div>
  );
}
