/**
 * Balansz-szimulátor.
 *
 *   node tools/balance-sim.mjs [órák]
 *
 * Egy "ésszerű játékost" modellez: mindig a legjobb megtérülésű állomásra költ,
 * managert vesz, ha 3 ciklus alatt megtérül, és új fogást nyit, ha marad tartaléka.
 * Nem használ képességet, eseményt és reklámot — ez tehát a **pesszimista alsó
 * becslés**. A valós haladás ennél gyorsabb.
 *
 * FIGYELEM: a lenti tábla a `src/game/config.ts` másolata. Ha ott változik a
 * balansz, ezt is frissítsd — ezért van egyetlen fájlban, könnyen összevethetően.
 */

const STATIONS = [
  // id, baseCost, costMult, baseIncome, cycleSec, managerCost
  ['maki', 4, 1.07, 1, 0.6, 1000],
  ['nigiri', 60, 1.15, 60, 3, 15000],
  ['sashimi', 720, 1.14, 540, 6, 100000],
  ['uramaki', 8640, 1.13, 4320, 12, 500000],
  ['temaki', 103680, 1.12, 51840, 24, 1200000],
  ['tempura', 1244160, 1.11, 622080, 96, 10000000],
  ['ramen', 14929920, 1.1, 7464360, 384, 111000000],
  ['dragon', 179159040, 1.09, 89579520, 1536, 1200000000],
  ['wagyu', 2149908480, 1.08, 1074954240, 3072, 14000000000],
  ['kaiseki', 25798901760, 1.07, 29668654080, 6144, 170000000000],
];

const MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800];
const SPEED_MILESTONES = [100, 200, 300];
/** A `store.ts` ingyen managere: a 10. szinten megjön Yuki. */
const FREE_MANAGER_LEVEL = 10;

const mile = (l) => MILESTONES.reduce((x, k) => (l >= k ? x * 2 : x), 1);
const spd = (l) => SPEED_MILESTONES.reduce((d, k) => (l >= k ? d * 2 : d), 1);
const costFor = (b, r, l, n) => (b * Math.pow(r, l) * (Math.pow(r, n) - 1)) / (r - 1);
const maxAff = (b, r, l, money) => {
  const first = b * Math.pow(r, l);
  if (money < first) return 0;
  return Math.floor(Math.log(1 + (money * (r - 1)) / first) / Math.log(r));
};
const starsFor = (lifetime) => Math.floor(20 * Math.sqrt(Math.max(0, lifetime) / 1e9));

function simulate(hours) {
  let money = 0;
  let lifetime = 0;
  const lvl = STATIONS.map(() => 0);
  const mgr = STATIONS.map(() => false);
  lvl[0] = 1;
  const log = [];
  const inc = (i) => STATIONS[i][3] * lvl[i] * mile(lvl[i]);
  const rate = (i) => (mgr[i] ? inc(i) / (STATIONS[i][4] / spd(lvl[i])) : 0);

  for (let t = 1; t <= hours * 3600; t++) {
    let r = STATIONS.reduce((a, _, i) => a + rate(i), 0);
    // Amíg nincs első manager, a játékos kattint.
    if (!mgr[0]) r += inc(0) / STATIONS[0][4];
    money += r;
    lifetime += r;

    if (!mgr[0] && lvl[0] >= FREE_MANAGER_LEVEL) {
      mgr[0] = true;
      log.push([t, 'ingyen manager (Yuki)']);
    }
    if (t % 10 !== 0) continue;

    for (let i = 0; i < STATIONS.length; i++) {
      if (!mgr[i] && lvl[i] > 0 && money >= STATIONS[i][5] * 3) {
        money -= STATIONS[i][5];
        mgr[i] = true;
        log.push([t, `manager: ${STATIONS[i][0]}`]);
      }
    }
    for (let i = 0; i < STATIONS.length; i++) {
      if (lvl[i] === 0 && money >= STATIONS[i][1] * 4) {
        money -= STATIONS[i][1];
        lvl[i] = 1;
        log.push([t, `új fogás: ${STATIONS[i][0]}`]);
        break;
      }
    }
    let best = -1;
    let bestRatio = 0;
    for (let i = 0; i < STATIONS.length; i++) {
      if (lvl[i] === 0) continue;
      const c = costFor(STATIONS[i][1], STATIONS[i][2], lvl[i], 1);
      const ratio = (STATIONS[i][3] * mile(lvl[i])) / (STATIONS[i][4] / spd(lvl[i])) / c;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    }
    if (best >= 0) {
      const n = maxAff(STATIONS[best][1], STATIONS[best][2], lvl[best], money * 0.7);
      if (n > 0) {
        money -= costFor(STATIONS[best][1], STATIONS[best][2], lvl[best], n);
        lvl[best] += n;
      }
    }
  }
  return { log, lifetime, lvl, stars: starsFor(lifetime) };
}

const hours = Number(process.argv[2] ?? 24);
const r = simulate(hours);

console.log(`\n=== ${hours} órás szimuláció ===\n`);
for (const [t, what] of r.log) {
  const m = t / 60;
  console.log(`${m < 90 ? `${m.toFixed(0)} perc` : `${(m / 60).toFixed(1)} óra`}`.padEnd(10), what);
}
console.log('\nÖsszes keresett:', r.lifetime.toExponential(2));
console.log('Elérhető csillag:', r.stars);
console.log('Szintek:', r.lvl.join(', '));
