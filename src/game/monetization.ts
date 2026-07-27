/**
 * Monetizációs adapter — EZ a projekt pénzt termelő rétege.
 *
 * A játék kód sehol nem hívja közvetlenül a hirdetés/IAP SDK-t, csak ezt.
 * Élesítéskor egyetlen fájlt cserélsz:
 *   - Web: nem csinál semmit (vagy AdSense/H5 ad network)
 *   - Android/iOS (Capacitor): @capacitor-community/admob + @capacitor/in-app-purchases
 *
 * A mock implementáció valódi késleltetéssel fut, hogy a UX-et (gomb letiltás,
 * "reklám betöltése..." állapot) már most helyesen teszteld.
 */
import { Capacitor } from '@capacitor/core';

/** A 4 jutalmazott reklámhely (Nap 5, lásd docs/HETI-TERV.md) — mindegyik önkéntes. */
export type RewardedPlacement =
  | 'offline_double'   // offline bevétel duplázása — a legjobban konvertáló hely
  | 'income_boost'     // x3 bevétel 4 percre (bolt)
  | 'shift_double'      // műszak-jutalom duplázása
  | 'skip_cooldown';    // műszak-cooldown átugrása

export interface IapProduct {
  sku: string;
  title: string;
  desc: string;
  /** Ajánlott induló ár USD-ben (a store majd lokalizálja). */
  price: string;
  badge?: string;
  best?: boolean;
}

/** Ez a katalógus megy be 1:1 a Google Play / App Store konzolba. */
export const IAP_CATALOG: IapProduct[] = [
  {
    sku: 'starter',
    title: 'Starter Pack',
    desc: '250 💎 + 4 hours of production instantly + ad-free',
    price: '$4.99',
    badge: '-70% TODAY ONLY',
    best: true,
  },
  { sku: 'gems_small', title: 'Handful of Gems', desc: '100 💎', price: '$1.99' },
  { sku: 'gems_large', title: 'Gem Chest', desc: '1200 💎 (+20% bonus)', price: '$19.99' },
  { sku: 'noads',      title: 'Ad-Free',  desc: 'No more forced ads', price: '$3.99' },
  {
    sku: 'vip',
    title: 'VIP Chef',
    desc: 'x2 income forever · 24-hour offline · 500 💎 · ad-free',
    price: '$9.99',
    badge: 'BEST VALUE',
  },
  { sku: 'gems_mega', title: 'Gem Vault', desc: '3500 💎 (+45% bonus)', price: '$49.99' },
  {
    sku: 'whale',
    title: "Chef's Legacy",
    desc: 'Everything in VIP + 10,000 💎 + 24 hours of production instantly + an extra kitchen spot',
    price: '$99.99',
    badge: 'ULTIMATE',
  },
];

export interface AdsProvider {
  isRewardedReady(placement: RewardedPlacement): boolean;
  /** true = a néző végignézte és jár a jutalom. */
  showRewarded(placement: RewardedPlacement): Promise<boolean>;
  showInterstitial(): Promise<void>;
}

export interface IapProvider {
  purchase(sku: string): Promise<boolean>;
  /** Visszaadja azokat a nem-fogyó sku-kat, amiket a bolt a fiókhoz talált. */
  restore(): Promise<string[]>;
}

/** ---- Mock (web / fejlesztés) ---- */

const mockAds: AdsProvider = {
  isRewardedReady: () => true,
  showRewarded: (placement) =>
    new Promise((resolve) => {
      console.info('[ads] rewarded megjelenítése:', placement);
      setTimeout(() => resolve(true), 900);
    }),
  showInterstitial: () => new Promise((r) => setTimeout(r, 400)),
};

const mockIap: IapProvider = {
  purchase: (sku) =>
    new Promise((resolve) => {
      console.info('[iap] vásárlás:', sku);
      setTimeout(() => resolve(true), 700);
    }),
  // Web/mock alatt nincs bolt, ami emlékezne a vásárlásra — a mentés maga
  // hordozza a `noAds`/`vip` jelzőt, tehát itt őszintén nincs mit visszaadni.
  // A natív adapter (lásd lent) a store valódi vásárlás-előzményéből tölt.
  restore: async () => [],
};

/**
 * ---- Natív (Capacitor / Android / iOS) ----
 *
 * Az AdMob SDK-t (és a benne lévő Google UMP GDPR-hozzájárulást) csak natív
 * platformon, csak egyszer, **lustán** töltjük be `import()`-tal — a webes/dev
 * build így akkor is fut, ha az `@capacitor-community/admob` csomag még
 * nincs telepítve (ez Nap 6 feladata, amikor az android/ios projekt létrejön).
 * A specifikátor szándékosan változóban van: statikus import esetén a
 * bundler már buildkor keresné a csomagot, és a webes build eltörne.
 */
const ADMOB_PKG = '@capacitor-community/admob';

/** A projekt saját AdMob-azonosítói (AdMob-fiók, 2026-07-27). Amíg nincs
 * natív build (Nap 6), ezek nem hívódnak — a `Capacitor.isNativePlatform()`
 * webes/dev alatt mindig false, tehát a mock ág fut. */
export const ADMOB_IDS = {
  appId: 'ca-app-pub-7308404292478422~8427617481',
  rewarded: 'ca-app-pub-7308404292478422/3913657408',
  interstitial: 'ca-app-pub-7308404292478422/1750528499',
};

/** Minimális felület abból, amit ténylegesen hívunk — a csomag saját típusai
 * csak akkor kellenek, ha a projektben ott van, ami itt szándékosan nem feltétel. */
interface AdMobModule {
  initialize(opts: { initializeForTesting: boolean }): Promise<void>;
  requestConsentInfo(): Promise<{ status: string }>;
  showConsentForm(): Promise<void>;
  prepareRewardVideoAd(opts: { options: { adId: string } }): Promise<void>;
  showRewardVideoAd(): Promise<unknown>;
  prepareInterstitial(opts: { adId: string }): Promise<void>;
  showInterstitial(): Promise<void>;
}

let admobPromise: Promise<AdMobModule | null> | null = null;

async function ensureAdmob() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!admobPromise) {
    admobPromise = (async () => {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.initialize({ initializeForTesting: import.meta.env.DEV });
      // GDPR/UMP: a beépített Google-hozzájárulási forma — csak akkor mutatja
      // magát, ha a felhasználó helyzete (pl. EU/EGT) megköveteli.
      const { status } = await AdMob.requestConsentInfo();
      if (status === 'REQUIRED') await AdMob.showConsentForm();
      return AdMob;
    })();
  }
  return admobPromise;
}

const capacitorAds: AdsProvider = {
  isRewardedReady: () => true,
  showRewarded: async (placement) => {
    try {
      const AdMob = await ensureAdmob();
      if (!AdMob) return false;
      await AdMob.prepareRewardVideoAd({ options: { adId: ADMOB_IDS.rewarded } });
      const result = await AdMob.showRewardVideoAd();
      return !!result;
    } catch (e) {
      console.warn('[ads] rewarded hiba', placement, e);
      return false;
    }
  },
  showInterstitial: async () => {
    try {
      const AdMob = await ensureAdmob();
      if (!AdMob) return;
      await AdMob.prepareInterstitial({ adId: ADMOB_IDS.interstitial });
      await AdMob.showInterstitial();
    } catch {
      /* nem töltött be reklám — csendben továbbengedjük a játékost */
    }
  },
};

/**
 * Play Billing / StoreKit — Nap 6-ban kerül be a natív projekt, ekkorra
 * jön a tényleges billing plugin (pl. `@capacitor-community/in-app-purchases`).
 * Az interfész és a hívási helyek (ShopPanel) már készen állnak; a natív
 * adapter idekötése egyetlen csere lesz, ugyanúgy, ahogy az AdMobnál fent.
 */
const capacitorIap: IapProvider = mockIap;

export const ads: AdsProvider = Capacitor.isNativePlatform() ? capacitorAds : mockAds;
export const iap: IapProvider = Capacitor.isNativePlatform() ? capacitorIap : mockIap;
