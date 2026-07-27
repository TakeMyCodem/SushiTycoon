# Balansz — mérés, nem érzés

A görbét nem tippelni kell, hanem szimulálni. A modell:

```bash
node tools/balance-sim.mjs 24
```

Egy „ésszerű játékost" modellez: a legjobb megtérülésű állomásra költ, managert vesz,
ha 3 ciklus alatt megtérül, új fogást nyit, ha marad tartaléka. **Nem** használ
képességet, eseményt, reklámot vagy gyémántot — ez tehát a **pesszimista alsó becslés**.

## Aktuális eredmény (1 / 24 / 168 óra)

A szimulátor a Nap 3-as frissítés óta a **menedzsment-réteg árazását is beszámítja**:
amint a 3. fogás megnyílik, a legjobb elérhető árszint nettó szorzójával (`REPUTATION_START`
= 50 hírnévnél ez a Városi átlag, ×1,39) szorzódik a bevétel. Az alapanyagköltséget
szándékosan **nem** vonja le (a beszerzési döntés aktív játékot igényelne) — ez nagyjából
kiegyenlíti a hírnév-dinamika hiányát (a valós játékos VIP-ekkel és jó műszakokkal 50 fölé
tolja a hírnevet, ami tovább nőtt bevételt adna). Képességet, eseményt, reklámot, séfet
és gyémántot továbbra sem használ — ez tehát **pesszimista alsó becslés**.

| Idő | Esemény |
|---|---|
| ~20 mp | Első manager (ingyen, a 10. szinten) — innentől él az idle-gazdaság |
| 1-2 perc | 2. és 3. fogás megnyílik → menedzsment-réteg bekapcsol (×1,39 árazás) |
| 16-55 perc | 2-6. manager |
| ~1 óra | Első prestige elérhető (10 csillag ≈ 2,5e8 összbevétel) |
| 12-17 óra | Utolsó két fogás (kaiseki) és managere |

| Időtartam | Összes keresett | Elérhető csillag |
|---|---|---|
| 1 óra | 6,10e8 | 15 |
| 24 óra | 3,41e12 | 1 167 |
| 168 óra (1 hét) | 4,94e15 | 44 433 |

168 órára (`node tools/balance-sim.mjs 168`) az összes fogás szinten 121-355 között áll —
vagyis egy hét pesszimista, tétlen (nincs koppintás, nincs séf) játék is **több tízezer
karrier-csillagot** hoz, ami a [Michelin-fokozatoknál](#végjáték--michelin-fokozatok-nap-3)
leírt 1000 csillagos 3. fokozat küszöbét simán átlépi — ha eléri a 15 prestige-et is.
Ez utóbbi a valódi szűk keresztmetszet: a szimulátor egyáltalán nem prestige-el (a modell
"mindig tovább fejleszt" stratégiát követ), tehát a végjáték-fokozatok eléréséhez a
prestige-gyakoriság a döntő tényező, nem a nyers bevétel.

## Amit a szimuláció talált (és javítottunk)

**Az első verzióban a játékos beragadt.** Ha valaki az első, 1000 érmés manager
megvétele előtt letette a telefont, **nulla** offline bevétellel tért vissza —
a managerrel nem rendelkező állomások ugyanis nem termelnek távollétben.
Egy idle játéknál ez a leggyakoribb lemorzsolódási pont: a játékos pont azt nem
kapja meg, amiért a műfajt választotta.

Javítás: a **10. szinten Yuki ingyen beugrik**. Mérve ~17 koppintás, azaz nagyjából
20 másodperc játék. Ettől kezdve minden játékosnak él az offline gazdasága,
és a visszatérési modal (a legjobban konvertáló reklámhely) is működik.

## Műszak-minijáték (Nap 2)

A műszak logikája (`src/game/shift.ts`) tiszta függvényekből áll, ezért fejlesztői
módban a böngészőkonzolból végigszimulálható:

```js
__shift.finishShift(__shift.newShift(), false)
```

Három játékos-profil szimulálva (8-8 műszak átlaga, 60 másodperc, VIP-előrevétellel
a profi esetén):

| Profil | Reakcióidő | Pont | Kiszolgálva | Pontosság | Jutalom | Csillag |
|---|---|---|---|---|---|---|
| Kezdő | 700 ms | 60 | 39 | 76% | ~14 perc termelés | ⭐ |
| Közepes | 450 ms | 85 | 41 | 88% | ~20 perc | ⭐⭐ |
| Profi | 300 ms | 157 | 41 | 97% | ~29 perc | ⭐⭐⭐ |

**A skill 2,6-szeres különbséget hoz** — nem a kattintás sebessége miatt (mindenki
hasonlót szolgál ki), hanem mert a profi **előreveszi a VIP vendégeket** (x3 pont)
és nem téveszt. Pont ez volt a cél: legyen benne döntés, ne csak reflex.

A jutalom plafonja 40 perc termelés, hogy az ügyes játék ne ütközzön falba, de a
szélsőséges kiugrás se törje meg a gazdaságot. A jutalom mindig a **jelenlegi
bevétel arányában** számít, így a késői játékban sem értéktelenedik el.

## Menedzsment-réteg (Nap 3)

### Árazás — a mozgó optimum

A nettó bevétel csúcsa `p* = (1 + k·tűrés) / 2k`, ahol `k` az árrugalmasság
(`PRICE_ELASTICITY = 0.7`) és a tűrés a hírnévből jön (0,6 → 2,2).
Ez azt jelenti, hogy az optimális ár **0,93-tól 1,81-ig vándorol** a hírnévvel:

| Hírnév | Ajánlott szint | Nettó szintenként (menza / barátságos / városi / prémium / luxus) |
|---|---|---|
| 0 | Barátságos | 0.65 / **0.72** / 0.66 / 0.39 / 0.33 |
| 20 | Városi átlag | 0.81 / 0.94 / **0.95** / 0.77 / 0.33 |
| 60 | Városi átlag | 1.05 / 1.39 / **1.54** / 1.53 / 1.21 |
| 100 | Prémium | 1.05 / 1.50 / 1.95 / **2.29** / 2.20 |

Vagyis maximális hírnévnél a rossz árszint (Barátságos) **35%-kal kevesebbet hoz**,
mint a jó — ez már érezhető büntetés a figyelmetlenségért, de nem játékvesztő.

> **Ha a `PRICE_ELASTICITY`-hez nyúlsz, ellenőrizd a fenti táblát.** Nagyobb `k`-nál
> minden hírnév-szinten ugyanaz az árszint nyer, és a döntés kikerül a játékból —
> ez volt az első verzió hibája (csak egyetlen váltás volt az egész 0-100 skálán).

### Alapanyag — miért arányos az ár

Egy adag alapanyag a **bevételének 20%-a**, nem fix összeg. Fix árnál a késői
játékban elhanyagolható aprópénz lenne, és a beszerzés díszletté válna.
Így viszont végig érezhető marad:

- napi piaci ingadozás: ±30%
- mennyiségi kedvezmény: -10% (6 óra) / -20% (24 óra)
- beszállítói szerződés felára: +15%

Aki jó napon, nagy tételben vásárol, a rosszul időzítőhöz képest kb. **35%-ot spórol
az alapanyagon**, ami a teljes profit ~7%-a. Elég, hogy megérje figyelni; nem elég,
hogy aki nem ér rá, lemaradjon a játékról.

A készletet **időben áruljuk** (1 / 6 / 24 óra), nem darabszámban: a játékosnak
nem kell fejben osztania a ciklusidővel, és a csomag automatikusan skálázódik
a fejlettségével.

## Recept-kombók (Nap 3)

Minden séfnek van egy fix "signature dish"-e (`comboDish` a `chefs.ts`-ben) — ha a séf a
konyhában van ÉS az a fogás nyitva van, +15% bevétel jár rá, a séf szintezhető alaphatásán
**felül**, nem szintezhető. Ez nem gacha-mechanika: a párosítás fix és látható a séf
kártyáján, a döntés a kinevezés, nem a szerencse.

Miért éri ez meg egy órát: enélkül a végjátékban a roster egyszer összeáll (legerősebb 5
séf betéve) és onnantól soha nem változik. A kombó ad okot arra, hogy amikor épp a
Wagyu-t fejleszted, Hanát tedd be (bár az ő alaphatása alapanyag-árra megy, nem Wagyu-ra),
ne a nyers legjobb bevétel-százalékú séfet — így a gyűjtemény a késői játékban is aktív
döntés marad, nem statikus optimalizálási feladat egyszeri megoldással.

A párosítások a séfek flavor-szövegéhez igazodnak (pl. Ryu → Dragon Roll, mert a flavor
szerint az ő receptje), és két fogásnak (sashimi, kaiseki) szándékosan két-két combo-séfe
is van — ez ad választást azon belül is, hogy melyik séf kerüljön be, ha épp azt a fogást
tolod.

## Végjáték — Michelin-fokozatok (Nap 3)

A sima "csillag" a prestige-valuta (perkekre költöd). A **fokozat** (`src/game/michelin.ts`)
ettől külön dolog, és két feltételből nyílik egyszerre: karrier-csillag (`stars + starsSpent`,
tehát az elköltött is számít) ÉS prestige-ek száma. Utóbbi szándékos: enélkül egyetlen
hosszú, prestige nélküli futással át lehetne ugrani a végjátékot — így viszont valódi
ismétlést kíván.

| Fokozat | Karrier-csillag | Prestige | Örök bónusz |
|---|---|---|---|
| ⭐ 1 csillag | 100 | 3 | +15% |
| ⭐⭐ 2 csillag | 400 | 8 | +35% |
| ⭐⭐⭐ 3 csillag | 1000 | 15 | +60% |

A szorzó a `globalMult`-ban fut össze, a liga-bónusszal és a többivel együtt.

## Nagy számok (>1e30)

A `fmt()` (`src/game/math.ts`) 1e80 körül elfogy a rövidítő-táblából (`aa`..`av`); efölött
tudományos jelölésre vált (`1.23e+95`), mert a `toFixed` 1e21 fölött hibás kimenetet adna
(`"1e+22av"`). Ellenőrizve node-ból 1e10 – 1e100 tartományban, nincs `NaN`/`Infinity` a
számítási láncban ilyen bevételeknél.

## Ökölszabályok, ha a balanszhoz nyúlsz

1. **Az első manager legkésőbb 60 másodpercen belül legyen meg.** Ez nem stílus
   kérdése: enélkül nincs offline bevétel, enélkül nincs visszatérés, enélkül nincs bevétel.
2. **Új fogás mindig legyen 10-30 percre.** Ha a következő nyitás 2 óránál messzebb
   van, a játékosnak nincs miért visszanéznie.
3. **Az első prestige 1-3 óra közé essen.** Korábban értéktelen, később már nem éli meg.
4. A `costMult` a késői állomásokon alacsonyabb — ez szándékos: így mindig megéri
   előre lépni, nem beragadni egy állomás szintjeinek darálásába.

## Ha módosítod a `config.ts`-t

A `tools/balance-sim.mjs` tartalmazza az állomástábla **másolatát** (szándékosan
függőségmentes, hogy `node`-dal futtatható legyen). Ha a config változik, a
szimulátort is frissítsd — különben hamis biztonságot ad.
