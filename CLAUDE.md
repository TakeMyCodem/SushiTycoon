# Sushi Empire — projekt-kontextus Claude számára

## Mi ez

Cross-platform idle/tycoon mobiljáték. Cél: **profit**, nem művészi élmény.
Egy kódbázis → web (PWA) + Android + iOS (Capacitor).
Keret: 1 hét fejlesztés. **Az irányadó terv: `docs/HETI-TERV.md`** — ha bármelyik
másik doksi mást mond, az elavult.

## Stack

- Vite + React 19 + TypeScript (strict)
- Zustand (egyetlen store: `src/game/store.ts`)
- Kézzel írt CSS (`src/index.css`) — nincs UI-könyvtár, nincs Tailwind
- Capacitor a natív buildekhez
- Grafika: emoji + CSS. **Ne javasolj képi asseteket** — szándékos döntés (0 art budget).

## Parancsok

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run android
```

## A játék rétegei (ezt tartsd fejben, mielőtt "feature-t" javasolsz)

1. **Passzív**: állomások, szintek, managerek, offline bevétel.
2. **Döntés**: `upgrades.ts` (allokáció) és `perks.ts` (csillag: szorzó VAGY perk).
3. **Aktív**: `abilities.ts` (cooldown, időzítés) + csúcsforgalom/VIP események.
4. **Ügyesség**: `shift.ts` — a 60 másodperces műszak-minijáték. Saját, 25 ms-os
   hurokkal fut a `ShiftGame.tsx`-ben, függetlenül az idle motortól.
5. **Menedzsment**: `management.ts` — árazás (mozgó optimum a hírnévvel),
   alapanyag-készlet és -piac. A 3. fogásnál kapcsol be.
6. **Gyűjtés**: `chefs.ts` — 13 séf, töredékekből, **loot box nélkül**.
7. **Cél**: `quests.ts` (32-es lánc, 3 aktív) és `achievements.ts` (mind +3% örökre).

A hátralévő két nagy irány (menedzsment-szimuláció, séf-gyűjtés, verseny)
a `docs/HETI-TERV.md`-ben van lebontva napokra.

Ha egy új ötlet egyik réteget sem erősíti, valószínűleg nem kell bele.
A "clicker-érzés" elleni gyógyszer mindig a 2. és 3. réteg, nem több kattintás.

## Architektúra-szabályok

1. **Minden balansz-szám a `src/game/config.ts`-be megy.** Ha egy számot máshol
   látsz beégetve, az hiba.
2. **A `math.ts` tiszta függvényeket tartalmaz** — nincs benne állapot, nincs mellékhatás.
   Így tesztelhető és a store-ból is, a UI-ból is hívható.
3. **A reklám/IAP kód sosem kerül a játéklogikába.** Minden a `monetization.ts`
   adapterén keresztül megy. Élesítéskor egyetlen fájl cserélődik.
4. **A játékhurok `setInterval` + valós időbélyeg, NEM `requestAnimationFrame`.**
   Az rAF háttérben/nem látható tabon leáll, egy idle játék viszont ilyenkor is termel.
   Ezt ne "optimalizáld" vissza rAF-re.
5. **Nincs `StrictMode`** a `main.tsx`-ben: dev módban kétszer indítaná a hurkot
   és dupla bevételt adna. Ez nem felejtés.
6. **Mentés:** localStorage, 5 mp-enként és minden `visibilitychange`/`pagehide` eseménynél.
   Mobilon az app bármikor megölhető — a periodikus mentés önmagában kevés.
7. **Mentés-kompatibilitás:** a `loadState` a friss alapértékekre húzza rá a mentett
   állapotot, így egy új állomás hozzáadása nem töri a régi mentéseket. Ezt tartsd meg.
8. **Minden bevételszorzó a `math.ts`-ben fut össze** (`globalMult` / `upgradeMult` /
   `cycleIncome`). Ne szórj szorzókat a komponensekbe — a fejlécben mutatott
   `displayMult` így marad igaz.
9. **Ideiglenes hatások egységesen az `effects` tömbben** vannak (reklám-boost,
   képesség, gyémánt-boost). Ne vezess be külön mezőt egy új boostnak.
10. **Az események és hatások nem élik túl a kilépést** (`loadState` nullázza őket),
    az offline bevétel pedig szándékosan nélkülük számol — különben a játékos
    kilépéssel tudná "elmenteni" a boostját.
11. **Hang és rezgés csak az `audio.ts`-ből.** Nincs hangfájl és nem is lesz:
    minden effekt WebAudio-val szintetizált.
12. **Az alapanyag offline is fogy** (`offlineEarnings` állomásonként korlátoz a
    készlettel, és a `claimOffline` levonja). Ha ezt "egyszerűsíted", a
    készletgazdálkodás kilépéssel megkerülhetővé válik.
13. **A `math.ts` és a `management.ts` kölcsönösen importálja egymást.** Ez működik,
    mert mindkettő csak hívási időben használja a másikat (hoistolt függvények).
    Ne tegyél egyikbe sem modul-szintű kódot, ami a másikat hívja.

## Fejlesztői segédlet

Dev módban a konzolból elérhető:

- `__game` — a teljes store (`getState()` / `setState()`)
- `__math` — a `math.ts` tiszta függvényei (`offlineEarnings`, `incomePerSec`, `costFor`, …)

Balanszteszthez ezt használd, ne írj át ideiglenesen config-számokat.
Példa (offline bevétel ellenőrzése 5 órára):

```js
__math.offlineEarnings(__game.getState().s, 5 * 3600e3)
```

**Van automatizált tesztkeretrendszer (vitest).** A tiszta logikájú modulok
(`math.ts`, `chefs.ts`, `league.ts`, `michelin.ts`, `shift.ts`) mellett egy-egy
`*.test.ts` fájl fut:

```bash
npm run test
```

Ha egy tiszta függvényt módosítasz ezekben a modulokban, **futtasd a teszteket**
— ez fedte fel korábban a `describeEffect` nyers-id hibáját és több szélsőérték-
esetet (`fmt()` 1e21 fölött). A `npm run check` script már ezt is lefuttatja
a `tsc`/`oxlint` mellett. Teszthez state kell? A `game/test-helpers.ts`
`makeState()`-je ad egy minimális, érvényes `GameState`-et, felülírható mezőkkel.

## Balansz

Ha a `config.ts` számaihoz nyúlsz, **futtasd a szimulátort**, ne érzésre dönts:

```bash
node tools/balance-sim.mjs 24
```

A követelmények és a korábbi tanulságok a [docs/BALANSZ.md](docs/BALANSZ.md)-ben.
A legfontosabb: az első manager 60 másodpercen belül legyen meg (a 10. szinten
ingyen megjön) — enélkül nincs offline bevétel, és összeomlik a retention.

## Séf-hatások — a leggyakoribb hibaforrás

A `chefBonus(state, kind, scope, stationId?)` **scope paramétere kötelező**, és nem
véletlenül: a globális (`target: 'all'`) hatás a `globalMult`-ban szorzódik, az
állomás-specifikus a `cycleIncome`-ban. Ha valahol `'both'`-ot használsz olyan helyen,
ahol a globális már beszámított, a séf **kétszer szoroz**. A ciklusidőnél azért jó a
`'both'`, mert ott csak egyszer szerepel.

## Amit ne csinálj

- Ne tegyél a játékba loot boxot vagy szerencsekereket (szabályozási kockázat EU-ban).
  A séfek szándékosan **fix áron, töredékekből** szerezhetők — ez nem "még nincs kész
  gacha", hanem tervezési döntés.
- Ne tegyél kényszerített reklámot az indításba (a legnagyobb D1-gyilkos).
- Ne vezess be szerveroldalt/fiókot az első verzióban (költség + GDPR-teher).
- Ne írj tesztet a UI-ra; ha tesztelni kell, a `math.ts` tiszta függvényeit teszteld.

## Nyelv

A kód angolul (azonosítók), a **kommentek és a dokumentáció magyarul**.
A játék UI szövege (minden játékosnak látható string: állomás-, fejlesztés-,
séf-, küldetés-, achievement-, banner- és toast-szöveg, `index.html` meta) mostantól
**angol** — ez megtörtént az angol lokalizációval. Új player-facing szöveget csak
angolul írj; a kód körüli kommentek maradnak magyarul.
