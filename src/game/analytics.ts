/**
 * Analitika-adapter. Web/dev alatt konzolra és egy memóriabufferbe ír.
 * Natív platformon (Nap 5, lásd docs/HETI-TERV.md) a Firebase Analytics SDK-t
 * tölti be lustán, ugyanazzal a mintával, mint a game/monetization.ts az
 * AdMobot — a csomag (`@capacitor-firebase/analytics`) hiánya a web/dev
 * buildet nem érinti, mert a natív ág sosem fut le böngészőben.
 *
 * Miért fontos: profitot csak azt tudsz optimalizálni, amit mérsz.
 * A kötelező minimum: session_start, station_unlocked, prestige,
 * ad_boost, iap_granted, offline_claimed.
 */
import { Capacitor } from '@capacitor/core';

type Props = Record<string, unknown>;

const buffer: { t: number; event: string; props: Props }[] = [];

const FIREBASE_PKG = '@capacitor-firebase/analytics';
interface FirebaseAnalyticsModule {
  logEvent(opts: { name: string; params?: Props }): Promise<void>;
}
let firebasePromise: Promise<FirebaseAnalyticsModule | null> | null = null;

async function ensureFirebase() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!firebasePromise) {
    firebasePromise = import(/* @vite-ignore */ FIREBASE_PKG)
      .then((m) => m.FirebaseAnalytics as FirebaseAnalyticsModule)
      .catch(() => null);
  }
  return firebasePromise;
}

export function track(event: string, props: Props = {}): void {
  buffer.push({ t: Date.now(), event, props });
  if (import.meta.env.DEV) console.debug('[analytics]', event, props);
  void ensureFirebase().then((fb) => fb?.logEvent({ name: event, params: props }));
}

export function getEventLog() {
  return buffer.slice();
}
