# Game Design Document — Sushi Empire

## Az élmény egy mondatban

*„Nyitok egy kis sushi-pultot, és mire észbe kapok, tíz étteremláncot vezetek —
és mindig van egy gomb, ami 10 másodperc múlva megnyomható."*

## A hurok

```
koppintás/idő  →  ciklus lejár  →  💰  →  szint vétel  →  gyorsabb/nagyobb bevétel
                                            ↓
                                      manager (automata) → megnyílik a KÉPESSÉGE
                                            ↓
                                    fejlesztés (döntés: hova tegyem?)
                                            ↓
                                     új állomás megnyitása
                                            ↓
                        (órák múlva) prestige → csillag → perk VAGY szorzó (döntés)
```

Négy egymásba ágyazott időskála — ez tartja bent a játékost:

| Skála | Mit csinál | Mennyi idő |
|---|---|---|
| **Másodpercek** | Koppint, szintet vesz, elkap egy VIP vendéget | 0,6-30 mp |
| **Percek** | Képességet süt el, csúcsforgalomra időzít, fejlesztést vesz | 3-25 perc (cooldownok) |
| **Órák** | Managert vesz fel, új állomást nyit, mérföldkövet ér el | 5 perc - 3 óra |
| **Napok** | Prestige, csillag-perkek, küldetéslánc | 4-24 óra |

### Miért nem clicker

A kattintás az első ~90 másodpercben számít (addig tart az első managerig — mérve
1,6 perc folyamatos kattintással). Utána a játék három másik dologról szól:

1. **Időzítés.** A csúcsforgalom 1 percig x2-t ad. Ha akkor sütöd el a Villámkezeket
   (x2) és a Lakomát (x3), egy percig x12-vel termelsz. Ugyanaz az idő, hatszoros haszon.
2. **Allokáció.** A fejlesztés véges erőforrás: a globális x2 négy állomás-fejlesztésnyi
   árba kerül. Melyik éri meg *most*, a jelenlegi bevételi összetételednél?
3. **Kompromisszum.** A csillag vagy +3% bevételt ad, vagy elkölthető perkre — de
   nem mindkettő. Ez minden prestige-nél újratárgyalt döntés.

## Balansz

Minden szám a `src/game/config.ts`-ben, egy helyen.

- **Ár:** `baseCost × costMult^szint`. A `costMult` 1.07-ről indul és a késői
  állomásokon csökken → mindig megéri előre lépni.
- **Bevétel:** `baseIncome × szint × mérföldkő-szorzó × globális szorzó`.
- **Mérföldkövek:** 25 / 50 / 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 szintnél **x2**.
  Ez adja a „még 3 szint és megduplázódik" húzóerőt.
- **Gyorsulás:** 100 / 200 / 300 szintnél a ciklusidő feleződik.
- **Prestige:** `csillag = 20 × √(összes valaha keresett pénz / 1e9)`, csillagonként **+3%**.
  Minimum 10 új csillag kell — ne lehessen percenként prestige-elni.

Ez a görbe (AdVenture Capitalist-alapú, arányosan gyorsítva) bizonyítottan
napokig fenntartja a haladás érzetét exponenciális számok mellett is.

## Miért nincs a játékban…

- **Loot box / szerencsekerék:** szabályozási kockázat több EU-országban, cserébe
  a bevétel néhány százaléka. Nem éri meg.
- **Energia/élet rendszer:** utálják, és idle-ben értelmetlen.
- **Kényszerített reklám indításkor:** a legnagyobb D1-gyilkos.
- **Online mentés / fiók:** szerverköltség és GDPR-teher az első verzióban. Helyben mentünk.
  (Felhő-mentés a v1.2 feladata, amikor már van miért.)

## Roadmap a v0.1 után

| Verzió | Tartalom | Miért |
|---|---|---|
| v0.2 | Küldetések, achievementek, VIP vendég esemény | Napi cél, aktív visszatérés |
| v0.3 | Upgrade-fa gyémántért | Gyémánt-nyelő → IAP értelmet kap |
| v1.0 | Hang, animációk, tutorial, natív reklám+IAP | Kiadható minőség |
| v1.1 | 2. étterem-téma (ramen bár), külön prestige-réteg | Hosszú távú tartalom |
| v1.2 | Felhő-mentés, ranglista | Kompetitív retention |
| v1.3 | Szezonális események (cseresznyevirágzás, újév) | Visszatérési okok |

## Kockázatok

| Kockázat | Kezelés |
|---|---|
| Senki nem találja meg | A hét utolsó napja teljesen ASO + videótartalom |
| Túl gyorsan „kijátszható" | A mérföldkövek 800 szintig, 10 állomás, korlátlan prestige |
| A reklámok elrontják az élményt | Csak önkéntes rewarded; az interstitial kikapcsolható, ha rontja a mért retention-t |
| Órabállítós csalás | Offline idő maximálva; a mentés `lastSeen`-t használ, nem monoton órát — a v1.0-ban szerveridő-ellenőrzés |
