import type { GameState } from './types';
import { STATIONS } from './config';

/**
 * Műszak — az aktív, ügyességi réteg.
 *
 * Miért kell: az idle rész magától termel, a képességek időzítést kérnek, de
 * *játszani* eddig nem lehetett. A műszakban a játékos maga szolgálja ki a
 * vendégeket 60 másodpercig — ez ad valódi jó/rossz teljesítményt, ismételhető
 * kihívást és természetes helyet a "próbáld újra" reklámnak.
 *
 * A modul szándékosan tiszta logika, DOM és React nélkül: így a nehézségi görbe
 * és a jutalom külön tesztelhető és hangolható.
 */

export const SHIFT_DURATION_MS = 60_000;
/** Két műszak között ennyi idő telik el. */
export const SHIFT_COOLDOWN_MS = 15 * 60_000;
/**
 * Legfeljebb ennyi másodpercnyi termelést fizethet egy műszak.
 * Mérve: kezdő ~14 perc, közepes ~20, profi ~29. A 40 perces plafon így
 * nem vágja le az ügyes játékot, csak a szélsőséges kiugrást fogja meg.
 */
export const SHIFT_REWARD_CAP_SECONDS = 2400;
/** A cooldown átugrásának ára. */
export const SHIFT_SKIP_GEMS = 15;
/** Egyszerre legfeljebb ennyi vendég vár. */
export const MAX_QUEUE = 5;

/**
 * Vendégtípusok. Ettől lesz a műszak döntés is, nem csak reflex:
 * a VIP sokat fizet, de hamar elmegy — előre kell venni. A nagy rendelés
 * két adagot kér ugyanabból, tehát két koppintást köt le, miközben mások várnak.
 */
export type CustomerKind = 'normal' | 'vip' | 'big';

export interface Customer {
  id: number;
  /** Melyik fogást kéri (station id). */
  dish: string;
  kind: CustomerKind;
  /** Hány adag kell még (nagy rendelésnél 2). */
  remaining: number;
  /** Mikor érkezett (a műszak eltelt ideje ms-ban). */
  bornAt: number;
  /** Ennyi ideje van kiszolgálásra. */
  patienceMs: number;
}

/** Pontérték szorzója vendégtípusonként. */
export const KIND_VALUE: Record<CustomerKind, number> = { normal: 1, vip: 3, big: 2.5 };
export const KIND_EMOJI: Record<CustomerKind, string> = { normal: '🙂', vip: '🎩', big: '👨‍👩‍👧' };

export interface ShiftState {
  elapsed: number;
  queue: Customer[];
  served: number;
  lost: number;
  mistakes: number;
  combo: number;
  bestCombo: number;
  points: number;
  nextSpawnAt: number;
  nextId: number;
}

export interface ShiftResult {
  served: number;
  lost: number;
  mistakes: number;
  bestCombo: number;
  points: number;
  accuracy: number;
  /** Hány másodpercnyi termelést ér a teljesítmény. */
  rewardSeconds: number;
  /** Csúcsforgalomban dupla. */
  rushBonus: boolean;
}

/** A műszakban kiszolgálható fogások: amit a játékos már megnyitott. */
export function shiftDishes(s: GameState): string[] {
  const unlocked = STATIONS.filter((d) => s.stations[d.id].level > 0).map((d) => d.id);
  // Legalább 3 különböző fogás kell, hogy legyen mit eltéveszteni.
  return unlocked.length >= 3 ? unlocked.slice(0, 6) : STATIONS.slice(0, 3).map((d) => d.id);
}

export function newShift(): ShiftState {
  return {
    elapsed: 0, queue: [], served: 0, lost: 0, mistakes: 0,
    combo: 0, bestCombo: 0, points: 0, nextSpawnAt: 300, nextId: 1,
  };
}

/**
 * Nehezedés: a vendégek egyre sűrűbben jönnek és egyre türelmetlenebbek.
 * A görbe úgy van hangolva, hogy az első 15 másodperc kényelmes legyen
 * (a játékos megtanulja), a vége viszont már kapkodás.
 */
export function spawnIntervalMs(elapsed: number): number {
  const t = elapsed / 1000;
  return Math.max(700, 2200 - t * 22);
}

export function patienceMsFor(elapsed: number): number {
  const t = elapsed / 1000;
  return Math.max(3800, 9000 - t * 65);
}

/** A kombó szorzója: 5 hibátlan kiszolgálásonként +0.5, x5-ig. */
export function comboMult(combo: number): number {
  return Math.min(5, 1 + Math.floor(combo / 5) * 0.5);
}

/**
 * Vendégtípus sorsolása. Az első 12 másodpercben csak sima vendég jön —
 * a játékosnak legyen ideje megérteni az alapot, mielőtt kivételek jönnek.
 */
export function pickKind(elapsed: number, rnd: () => number = Math.random): CustomerKind {
  if (elapsed < 12_000) return 'normal';
  const r = rnd();
  if (r < 0.12) return 'vip';
  if (r < 0.28) return 'big';
  return 'normal';
}

/**
 * Egy lépés a műszakban. Tiszta függvény: bemenet az állapot + eltelt idő,
 * kimenet az új állapot és a történt események (hanghoz, animációhoz).
 */
export function stepShift(
  st: ShiftState,
  dtMs: number,
  dishes: string[],
  rnd: () => number = Math.random,
): { state: ShiftState; lostNow: number } {
  const elapsed = st.elapsed + dtMs;
  let queue = st.queue;
  let lost = st.lost;
  let combo = st.combo;
  let nextSpawnAt = st.nextSpawnAt;
  let nextId = st.nextId;

  // Elfogyott türelmű vendégek távoznak.
  const stillWaiting = queue.filter((c) => elapsed - c.bornAt < c.patienceMs);
  const lostNow = queue.length - stillWaiting.length;
  if (lostNow > 0) {
    queue = stillWaiting;
    lost += lostNow;
    combo = 0;
  }

  // Új vendég érkezése.
  if (elapsed >= nextSpawnAt && queue.length < MAX_QUEUE) {
    const kind = pickKind(elapsed, rnd);
    queue = [
      ...queue,
      {
        id: nextId++,
        dish: dishes[Math.floor(rnd() * dishes.length)],
        kind,
        remaining: kind === 'big' ? 2 : 1,
        bornAt: elapsed,
        // A VIP fizet a legtöbbet, de a legkevésbé türelmes.
        patienceMs: patienceMsFor(elapsed) * (kind === 'vip' ? 0.6 : kind === 'big' ? 1.35 : 1),
      },
    ];
    nextSpawnAt = elapsed + spawnIntervalMs(elapsed);
  } else if (elapsed >= nextSpawnAt) {
    // Tele a sor — kicsit később próbálkozunk újra.
    nextSpawnAt = elapsed + 400;
  }

  return { state: { ...st, elapsed, queue, lost, combo, nextSpawnAt, nextId }, lostNow };
}

/**
 * A játékos egy fogásra koppintott. A sorban legrégebben váró, ezt a fogást
 * kérő vendéget szolgálja ki. Ha senki nem ezt kérte, az hiba.
 */
export function serveDish(st: ShiftState, dish: string): { state: ShiftState; ok: boolean; gained: number } {
  const idx = st.queue.findIndex((c) => c.dish === dish);
  if (idx < 0) {
    return {
      state: { ...st, combo: 0, mistakes: st.mistakes + 1 },
      ok: false,
      gained: 0,
    };
  }
  const customer = st.queue[idx];

  // Nagy rendelés: az első adag még nem fejezi be a vendéget, de a kombót viszi.
  if (customer.remaining > 1) {
    const combo = st.combo + 1;
    return {
      state: {
        ...st,
        queue: st.queue.map((c, i) => (i === idx ? { ...c, remaining: c.remaining - 1 } : c)),
        combo,
        bestCombo: Math.max(st.bestCombo, combo),
      },
      ok: true,
      gained: 0,
    };
  }

  const combo = st.combo + 1;
  const gained = comboMult(st.combo) * KIND_VALUE[customer.kind];
  return {
    state: {
      ...st,
      queue: st.queue.filter((_, i) => i !== idx),
      served: st.served + 1,
      combo,
      bestCombo: Math.max(st.bestCombo, combo),
      points: st.points + gained,
    },
    ok: true,
    gained,
  };
}

/**
 * A műszak zárása: pontból másodpercnyi termelés.
 * A `pointsMult` a séf-bónuszt hozza (pl. Takeshi +25% műszak-pont).
 */
export function finishShift(st: ShiftState, rushBonus: boolean, pointsMult = 1): ShiftResult {
  const attempts = st.served + st.lost + st.mistakes;
  const accuracy = attempts === 0 ? 0 : st.served / attempts;
  const points = st.points * pointsMult;
  const raw = points * 14 * (rushBonus ? 2 : 1);
  return {
    served: st.served,
    lost: st.lost,
    mistakes: st.mistakes,
    bestCombo: st.bestCombo,
    points: Math.round(points * 10) / 10,
    accuracy,
    rewardSeconds: Math.min(SHIFT_REWARD_CAP_SECONDS, Math.round(raw)),
    rushBonus,
  };
}

/** Csillagos értékelés az eredményképernyőre — legyen mit túlszárnyalni. */
export function shiftStars(r: ShiftResult): number {
  if (r.served >= 30 && r.accuracy >= 0.9) return 3;
  if (r.served >= 18 && r.accuracy >= 0.75) return 2;
  if (r.served >= 8) return 1;
  return 0;
}
