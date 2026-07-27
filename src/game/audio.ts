/**
 * Hangeffektek WebAudio-val **szintetizálva** — nincs egyetlen hangfájl sem.
 *
 * Miért: 0 byte asset, 0 licencgond, és a build mérete nem nő. Egy casual
 * játéknál a visszajelzés a lényeg, nem a hangminőség.
 *
 * A böngészők tiltják a hangot felhasználói interakció előtt, ezért az
 * AudioContext lustán, az első koppintásra jön létre.
 */
let ctx: AudioContext | null = null;
let muted = localStorage.getItem('sushi-muted') === '1';
let vibeOn = localStorage.getItem('sushi-vibe') !== '0';

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('sushi-muted', muted ? '1' : '0');
  return muted;
}

export function isVibeOn(): boolean {
  return vibeOn;
}

export function toggleVibe(): boolean {
  vibeOn = !vibeOn;
  localStorage.setItem('sushi-vibe', vibeOn ? '1' : '0');
  return vibeOn;
}

type Wave = OscillatorType;

/** Egy rövid hang: frekvencia-csúszás + exponenciális lecsengés. */
function tone(freq: number, endFreq: number, ms: number, gain: number, wave: Wave = 'sine', delay = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + ms / 1000);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(env).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

/** Akkord/futam több hangból — ünnepélyesebb eseményekhez. */
function arp(freqs: number[], step: number, ms: number, gain: number, wave: Wave = 'triangle') {
  freqs.forEach((f, i) => tone(f, f, ms, gain, wave, (i * step) / 1000));
}

/**
 * Rezgés. Androidon és PWA-ban működik (iOS Safari nem támogatja — ott
 * csendben nem történik semmi, ami rendben van).
 * Külön kapcsoló a hangtól: van, aki hangtalanul is szereti a visszajelzést
 * a kezében, és van, aki pont fordítva — a beállítások képernyő mindkettőt adja.
 */
function buzz(ms: number | number[]) {
  if (!vibeOn) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nem támogatott — nem baj */
  }
}

export const sfx = {
  tap: () => { tone(440, 620, 70, 0.05, 'triangle'); buzz(8); },
  buy: () => { tone(700, 1100, 90, 0.06, 'square'); buzz(12); },
  coin: () => { arp([880, 1320], 60, 130, 0.06); buzz(20); },
  hire: () => { arp([523, 659, 784], 70, 180, 0.06); buzz([15, 40, 15]); },
  upgrade: () => { arp([659, 880], 55, 160, 0.06, 'square'); buzz(18); },
  ability: () => { tone(300, 1200, 260, 0.07, 'sawtooth'); buzz([10, 30, 25]); },
  quest: () => { arp([784, 988, 1319], 80, 220, 0.06); buzz([20, 50, 20]); },
  prestige: () => { arp([523, 659, 784, 1047, 1319], 90, 320, 0.07); buzz([30, 60, 30, 60, 60]); },
  rush: () => { arp([392, 523, 659, 784], 70, 240, 0.07, 'square'); buzz([25, 40, 25]); },
  vip: () => { arp([1047, 1319], 90, 200, 0.06); buzz([15, 30, 15]); },
};
