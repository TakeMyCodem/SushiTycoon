# 🍣 Sushi Empire — Idle Tycoon

Cross-platform idle/tycoon játék. **Egy kódbázis**, három platform: web (PWA), Android, iOS.

> **Státusz:** játszható v0.3 — core loop, fejlesztésfa, manager-képességek,
> csúcsforgalom és VIP események, küldetéslánc, trófeák, csillag-perkek,
> offline bevétel, hang és rezgés. Ami hátra van: valódi reklám/IAP SDK-k
> bekötése és store-kiadás (lásd [docs/HETI-TERV.md](docs/HETI-TERV.md)).

## Miért nem "csak egy clicker"

Három réteg épül egymásra — a kattintás csak az első 90 másodpercben főszereplő:

| Réteg | Mit ad | Hol van |
|---|---|---|
| **Ügyesség** | **Műszak**: 60 másodperces kiszolgálós minijáték kombóval, VIP és nagy rendelésekkel. Mérve 2,6-szeres különbség kezdő és profi között | `shift.ts`, `ShiftGame.tsx` |
| **Menedzsment** | Étlap-árazás, ahol az optimum a **hírnévvel együtt mozog**, plus alapanyag-piac napi árakkal, mennyiségi kedvezménnyel és beszállítói szerződéssel | `management.ts` |
| **Gyűjtés** | 13 séf ritkasággal és passzív hatásokkal, töredékekből, **loot box nélkül**. A döntés a kinevezés: kevés a hely, és az azonos iskolájú páros bónuszt ad | `chefs.ts` |
| **Döntés** | Fejlesztésfa (globális vs. állomás-specifikus) és csillag-perkek, ahol az elköltött csillag **már nem ad bevétel-bónuszt** — valódi kompromisszum | `upgrades.ts`, `perks.ts` |
| **Aktív** | Manager-képességek cooldownnal, csúcsforgalom (x2, 1 perc), elkapható VIP vendégek. A jó játékos a képességeket a csúcsforgalomra időzíti és összeláncolja | `abilities.ts`, események a `store.ts`-ben |
| **Cél** | 27 küldetésből álló lánc (mindig 3 aktív) és 24 trófea, mindegyik +3% örök bevétellel | `quests.ts`, `achievements.ts` |

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
    chefs.ts         Séf-gyűjtemény: ritkaság, töredékek, hatások, iskola-szinergia.
    quests.ts        24 elemű küldetéslánc.
    achievements.ts  20 trófea, mind +3% örök bevétel.
    math.ts          Tiszta függvények: formázás, árak, bevétel, offline, prestige.
    store.ts         Zustand store — a teljes játékállapot és minden akció.
    audio.ts         Szintetizált hangeffektek + rezgés (nulla hangfájl).
    monetization.ts  Ads + IAP adapter. Élesítéskor EZT az egy fájlt cseréled.
    analytics.ts     Eseménykövetés-adapter.
    types.ts
  components/
    TopBar, StationCard, Conveyor, AbilityBar, EventLayer, Modals
    ShiftGame, ShiftLauncher   A műszak minijáték és indítója
    panels/          Fejlesztés, Küldetés, Csillag, Bolt fülek
  App.tsx            Játékhurok + fül-navigáció
docs/                Terv, üzleti modell, kiadási checklist
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
