# 🍣 Sushi Empire — Idle Tycoon

Cross-platform idle/tycoon játék. **Egy kódbázis**, három platform: web (PWA), Android, iOS.

> **🔗 Próbáld ki most, telefonon vagy böngészőben:**
> **[takemycodem.github.io/SushiTycoon](https://takemycodem.github.io/SushiTycoon/)**
> — nincs telepítés, nincs fiók, minden reklám/fizetés mock (nem költesz semmit).

> **Státusz:** játszható v0.5 — core loop, fejlesztésfa, manager-képességek,
> csúcsforgalom és VIP események, műszak-minijáték, menedzsment-réteg
> (árazás, hírnév, alapanyag), séf-gyűjtemény recept-kombókkal, heti liga,
> Michelin-fokozatú végjáték, küldetéslánc, trófeák, csillag-perkek,
> offline bevétel, hang/rezgés, beállítások (nagyobb betűméret, mentés
> export/import), angol UI, és egy lustán betöltött natív reklám/IAP adapter
> (teszt-azonosítókkal, éles natív build nélkül még nem aktív).
> Ami hátra van: natív build (Android/iOS) és store-kiadás
> (lásd [docs/HETI-TERV.md](docs/HETI-TERV.md)).

## Miért nem "csak egy clicker"

Öt réteg épül egymásra — a kattintás csak az első 90 másodpercben főszereplő:

| Réteg | Mit ad | Hol van |
|---|---|---|
| **Ügyesség** | **Műszak**: 60 másodperces kiszolgálós minijáték kombóval, VIP és nagy rendelésekkel. Mérve 2,6-szeres különbség kezdő és profi között | `shift.ts`, `ShiftGame.tsx` |
| **Menedzsment** | Étlap-árazás, ahol az optimum a **hírnévvel együtt mozog**, plus alapanyag-piac napi árakkal, mennyiségi kedvezménnyel és beszállítói szerződéssel | `management.ts` |
| **Gyűjtés** | 13 séf ritkasággal és passzív hatásokkal, töredékekből, **loot box nélkül**. A döntés a kinevezés: kevés a hely, az azonos iskolájú páros bónuszt ad, és minden séfnek van egy recept-kombója (signature dish, +15%) | `chefs.ts` |
| **Verseny** | Heti liga, 20 fős tábla, 5 divízió, szimulált (nulla backend) ellenfelek — a pontszám kizárólag a műszak-teljesítményből jön | `league.ts` |
| **Döntés** | Fejlesztésfa (globális vs. állomás-specifikus) és csillag-perkek, ahol az elköltött csillag **már nem ad bevétel-bónuszt** — valódi kompromisszum | `upgrades.ts`, `perks.ts` |
| **Aktív** | Manager-képességek cooldownnal, csúcsforgalom (x2, 1 perc), elkapható VIP vendégek. A jó játékos a képességeket a csúcsforgalomra időzíti és összeláncolja | `abilities.ts`, események a `store.ts`-ben |
| **Végjáték** | Michelin-fokozatok (karrier-csillag + prestige-szám együtt nyitja, +15/35/60% örök bónusz) | `michelin.ts` |
| **Cél** | 30 elemű küldetéslánc (mindig 3 aktív) és 33 trófea, mindegyik +3% örök bevétellel | `quests.ts`, `achievements.ts` |

## Miért pont ez a játék?

A cél a **legjobb profit 1 hét alatt**, nem a legszebb játék. Ezért idle tycoon:

| Szempont | Miért nyer az idle tycoon |
|---|---|
| Fejlesztési idő | Nincs fizika, nincs multiplayer, nincs pályaszerkesztő. A "grafika" emoji + CSS — **0 Ft art budget**. |
| Beszippantás | A bevált hurok: rövid ciklus → azonnali jutalom → mindig van egy 30 mp-re lévő következő cél. Sosem éred el a plafont. |
| Monetizáció | A műfaj **természetesen** ad el időt: "várj 4 órát vagy nézz meg egy reklámot". Nem érződik erőltetettnek. |
| Retention | Az offline bevétel miatt a játékos **holnap is visszajön** — ez az egyetlen dolog, ami hosszú távon pénzt hoz. |
| Cross-platform | Semmi platform-specifikus kód. Web build + Capacitor wrapper. |

Téma: **sushi étterem**. Ételtéma → univerzálisan érthető, nem kell lokalizálni a fantáziát,
az emoji-készlet (🍙🍣🐟🍥🌯🍤🍜🐉🥩🍱) készen ad 10 egyértelmű, "felfelé haladó" vizuált.

## Gyors indítás

```bash
npm install
```

```bash
npm run dev
```

Böngészőben: http://localhost:5173 — mobil nézetben (F12 → eszköz emuláció) a leghitelesebb.

Produkciós build:

```bash
npm run build
```

## Natív buildek

```bash
npx cap add android
```

```bash
npm run android
```

iOS-hez macOS + Xcode kell:

```bash
npx cap add ios
```

## Projektfelépítés

```
src/
  game/
    config.ts        Balansz: állomások, árak, mérföldkövek, esemény-időzítés.
    upgrades.ts      Fejlesztésfa (globális + állomásonként 4 szint).
    perks.ts         Csillagért vehető állandó perkek.
    abilities.ts     Manager-képességek (cooldown, hatás).
    shift.ts         Műszak-minijáték tiszta logikája (spawn, kombó, pontozás).
    management.ts    Árazás, hírnév, alapanyagpiac (napi ár, kedvezmény, szerződés).
    chefs.ts         Séf-gyűjtemény: ritkaság, töredékek, hatások, iskola-szinergia, recept-kombók.
    league.ts        Heti liga: divíziók, determinisztikus botok, fel-/kiesés.
    michelin.ts       Végjáték-fokozatok: karrier-csillag + prestige-szám alapján.
    quests.ts        30 elemű küldetéslánc.
    achievements.ts  33 trófea, mind +3% örök bevétel.
    math.ts          Tiszta függvények: formázás, árak, bevétel, offline, prestige.
    store.ts         Zustand store — a teljes játékállapot és minden akció.
    audio.ts         Szintetizált hangeffektek + rezgés (nulla hangfájl), külön kapcsolóval.
    settings.ts      Nagyobb betűméret, mentés export/import.
    monetization.ts  Ads + IAP adapter — lustán töltött natív AdMob/UMP ág, mock webes ág.
    analytics.ts     Eseménykövetés-adapter (lustán töltött Firebase natívon).
    types.ts
  components/
    TopBar, StationCard, Conveyor, AbilityBar, EventLayer, Modals, SettingsModal, ConsentBanner
    ShiftGame, ShiftLauncher   A műszak minijáték és indítója
    panels/          Vezetés, Fejlesztés, Küldetés, Liga, Csillag, Bolt fülek
  App.tsx            Játékhurok + fül-navigáció
public/
  privacy.html       Adatvédelmi tájékoztató (store-kiadáshoz is kell).
  sw.js              Service worker — app-shell cache offline induláshoz.
docs/                Terv, üzleti modell, kiadási checklist, balansz
```

**Fontos tervezési döntések:**

- A játékhurok `setInterval` + valós időbélyeg, **nem** `requestAnimationFrame`.
  Az rAF háttérben leáll, egy idle játék viszont ilyenkor is termel.
- Nincs `StrictMode` — dev módban duplán indítaná a hurkot, dupla bevétellel.
- Minden bevételszámítás dt-alapú, így a böngésző throttlingja sem visz el pénzt.
- A mentés localStorage-ban van, minden háttérbe váltáskor is kiíródik (mobilon kritikus).

## Fejlesztői konzol

Dev módban a store elérhető a böngészőkonzolból balanszteszthez:

```js
__game.setState(s => ({ s: { ...s.s, money: 1e12 } }))
```

## Dokumentáció

- [docs/BALANSZ.md](docs/BALANSZ.md) — a görbe mérése, `node tools/balance-sim.mjs 24`
- **[docs/HETI-TERV.md](docs/HETI-TERV.md) — az irányadó terv: mi van kész, és mi jön melyik napon**
- [docs/UZLETI-MODELL.md](docs/UZLETI-MODELL.md) — hogyan lesz ebből pénz, konkrét számokkal
- [docs/KIADASI-CHECKLIST.md](docs/KIADASI-CHECKLIST.md) — store-feltöltés lépésről lépésre
- [docs/GDD.md](docs/GDD.md) — game design: hurok, balansz, roadmap
