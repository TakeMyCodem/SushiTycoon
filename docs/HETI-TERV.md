# Heti terv — Sushi Empire

**Készült:** a projekt 1. napjának végén.
**Ez a dokumentum az irányadó terv.** Ha bármelyik másik doksi mást mond, ez a nyerő.

---

## Hol tartunk most (Nap 1-5 kész, Nap 6 részleges — 2026-07-27)

*Ez a szakasz a legutóbbi átfogó frissítésig tartja magát pontosnak; a fenti napi
bontás az eredeti terv, egyes tartalmak (Liga, Michelin-fokozat, séf-kombó,
tesztkeret) a napi bontáshoz képest bővültek menet közben.*

| Réteg | Mi van kész |
|---|---|
| **Idle alap** | 10 fogás exponenciális görbével, managerek, mérföldkövek, offline bevétel, prestige (Michelin csillag) |
| **Döntés** | Fejlesztésfa (6 globális + 40 állomás-specifikus), 7 csillag-perk, ahol az elköltött csillag már nem ad szorzót |
| **Aktív** | 6 manager-képesség cooldownnal, csúcsforgalom-esemény, elkapható VIP vendégek |
| **Ügyesség** | 60 másodperces műszak-minijáték: kombó, VIP és nagy rendelés, csillagos értékelés, reklámos duplázás |
| **Menedzsment** | Étlap-árazás mozgó optimummal, hírnév 0-100, alapanyagpiac napi árakkal, beszállítói szerződés |
| **Gyűjtés** | 13 séf ritkasággal, töredékekből, loot box nélkül; konyhai helyek, iskola-szinergia, **recept-kombók** (+15% a séf saját fogásán) |
| **Verseny** | **Heti liga**: 20 fős tábla, 5 divízió, determinisztikus (szerver nélküli) botok, fel-/kiesés |
| **Végjáték** | **Michelin-fokozatok**: karrier-csillag + prestige-szám együtt nyitja, +15/35/60% örök bónusz |
| **Cél** | 30 küldetésből álló lánc, 33 trófea (mind +3% örök bevétel), napi jutalom |
| **Beállítások** | Hang/rezgés külön kapcsoló, nagyobb betűméret, mentés export/import, `prefers-reduced-motion` |
| **Technika** | PWA (offline indul, SW-útvonalak javítva alkönyvtáras deployhoz), Capacitor konfig, szintetizált hang + rezgés, balansz-szimulátor (1/24/168 óra), lustán töltött natív reklám/IAP/analitika adapter (teszt-azonosítókkal), **217 automatizált teszt** (`npm run test`), GitHub Actions CI (teszt + build minden push-nál) |
| **Élesítve** | Web build ingyenes GitHub Pages teszt-linken: https://takemycodem.github.io/SushiTycoon/, adatvédelmi tájékoztatóval |

**Ami még nincs meg:** valódi reklám- és fizetés-SDK bekötve (az adapter kész,
csak a natív build hiányzik mögüle), natív Android/iOS build (a `android/`
mappa helyben scaffoldolva, de ezen a gépen nincs Android SDK/Studio a tényleges
buildhez), store-oldal, ikon-/splash-generálás, valódi eszközteszt.

---

## A hét célja egy mondatban

> A hét végére legyen egy **kiadható**, mért és belőtt játék a Google Play nyílt tesztjében
> és a weben — valódi reklám- és fizetés-bekötéssel.

---

## Nap 2 — Verseny és közösség (liga)

Ez a négy jóváhagyott mélyítési irány közül az utolsó.

**Mit építek**
- **Heti liga**: a játékos hetente pontot gyűjt (műszak-eredmények + haladás), és
  egy 20 fős ligában versenyez
- **Szimulált ellenfelek**: az ellenfelek a hét sorszámából és a játékos szintjéből
  determinisztikusan generálódnak — **nulla backend, nulla szerverköltség, nulla GDPR-teher**
- **Divíziók**: Bronz → Ezüst → Arany → Platina → Gyémánt, feljutással és kieséssel
- **Heti jutalom**: gyémánt, séf-töredék, és a divízióhoz kötött állandó bónusz
- **Rekordok**: legjobb műszak, leghosszabb sorozat, összes kiszolgált vendég

**Miért ér ez meg egy napot**
A liga adja az egyetlen olyan visszatérési okot, ami nem a saját haladásból jön:
"hétfőn zárul a forduló, most kell egy jó műszak". A szimulált ellenfél nem trükk —
sok kiadott idle játék így csinálja, és a játékos élménye szempontjából ugyanaz.

**Amire figyelek**
- Az ellenfelek nehézsége a játékos saját haladásához igazodjon, különben vagy
  unalmas, vagy demoralizáló
- A liga **ne legyen pay-to-win**: a pontozás a műszak-teljesítményre épüljön, ne a
  megvásárolható bevételre

---

## Nap 3 — Egyensúly, hosszú táv, végjáték

Hat rendszer van a játékban. Eddig külön-külön hangoltam őket; ezen a napon **együtt**.

**Mit csinálok**
- A balansz-szimulátort kiterjesztem az összes új rendszerre (műszak, séfek, árazás,
  alapanyagköltség), és lefuttatom 1 / 24 / 168 órára
- Megkeresem, hol áll meg a haladás érzete, és ott javítok
- **Végjáték**: mi történik, ha valaki mind a 10 fogást megnyitotta és 5-ször prestige-elt?
  Terv: Michelin-fokozatok (2. és 3. csillag) új, nehezebb célokkal és külön szorzóval
- **Recept-kombók**: adott séf + adott fogás párosítás extra bónuszt ad — ez ad okot
  a gyűjtemény cserélgetésére a végjátékban
- Ellenőrzöm a nagy számok kezelését 1e30 felett

**Kimenet:** egy `docs/BALANSZ.md` frissítés konkrét mért számokkal, nem érzésre.

---

## Nap 4 — Bevezetés, beállítások, hozzáférhetőség

**Ez a nap dönti el a D1 retentiont.** A játék most okos, de egy új játékos hat rendszerbe
csöppen bele egyszerre.

**Mit csinálok**
- **Fokozatos feltárás**: minden rendszer akkor jelenjen meg először, amikor értelme van
  (a séfek fül már az elején, a liga a 3. fogástól, a menedzsment ott, ahol most)
- **Vezetett első 3 perc**: nem modális tutorial, hanem célzott, egymondatos lépések —
  az első koppintástól az első managerig és az első műszakig
- **Beállítások képernyő**: hang, rezgés, mentés exportálása/importálása (ez adja vissza
  a játékosnak a kontrollt a saját mentése felett), adatvédelmi link, jogi információk
- **Hozzáférhetőség**: nagyobb betűméret opció, `prefers-reduced-motion` tisztelete,
  színvakbarát jelzések (ne csak szín különböztesse meg az állapotokat)
- Kis képernyő (360×640) és notch-os iPhone ellenőrzése

---

## Nap 5 — Monetizáció élesítése és mérés

**Kódoldalon elkészült, fiók nélkül tesztelt állapotban:**
- `game/monetization.ts`: AdMob-adapter (teszt-azonosítókkal), lustán, csak natív
  platformon töltve — a webes build a csomag nélkül is fut és épül
- A 4 jutalmazott reklámhely helyesen elkülönítve és bekötve: `offline_double`
  (OfflineModal), `income_boost` (bolt), `shift_double` (műszak-eredmény),
  `skip_cooldown` (ShiftLauncher)
- GDPR: natívon a Google UMP (az AdMob csomag része) automatikusan kéri a
  hozzájárulást; weben egy saját `ConsentBanner` az első indításkor
- "Vásárlások visszaállítása" gomb a boltban (Apple megköveteli) — őszintén
  jelzi, hogy web/mock alatt nincs mit visszaadni, natívon a bolt tényleges
  vásárlás-előzményéből fog dolgozni
- `game/analytics.ts`: Firebase Analytics-hoz ugyanaz a lusta-natív minta

**⚠️ Ehhez kellenek a te fiókjaid — ezt nélküled nem tudom befejezni.**

**Amit én megcsinálok**
- `@capacitor-community/admob` bekötése a `monetization.ts` mögé, teszt-azonosítókkal
- Mind a 4 jutalmazott reklámhely végigpróbálása (offline duplázás, x3 boost,
  műszak-duplázás, cooldown-átugrás)
- Google Play Billing / StoreKit termékek bekötése, sandbox-teszt
- **"Vásárlások visszaállítása" gomb** — enélkül az App Store elutasítja
- Analitika (GameAnalytics vagy Firebase) az `analytics.ts` mögé
- GDPR hozzájárulás-kezelő (Google UMP, ingyenes)

**Amit tőled kérek majd** (jó előre szólok, mert átfutási ideje van)
1. **Google Play fejlesztői fiók** ($25 egyszeri) — az azonosság-igazolás 2-3 nap!
2. **AdMob fiók** és a hozzá tartozó alkalmazás-azonosítók
3. Döntés: induljon-e egyszerre az iOS ($99/év + Mac + Xcode kell hozzá), vagy
   először csak web + Android

---

## Nap 6 — Natív build, eszközteszt, teljesítmény

**Frissítve: van már működő debug build.**
- [x] `npx cap add android` lefutott — az `android/` mappa helyben létezik
      (szándékosan NEM kerül git-be, lásd `.gitignore` — a `cap add` bármikor
      újra legenerálja, nincs kézzel szerkesztett tartalma)
- [x] **Android SDK + JDK 21 telepítve erre a gépre** (a te engedélyeddel):
  - JDK 21 (Eclipse Temurin, `winget install EclipseAdoptium.Temurin.21.JDK`)
    → `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`
  - Android SDK parancssori eszközök → `C:\Android\sdk`
    (platform-tools, platforms;android-36, build-tools 35.0.0 + 36.0.0)
  - **Rendszerszintű módosítás ezen a gépen ennyi volt** — nincs PATH/env
    változó globálisan beállítva, minden a build parancsban explicit exportolva
- [x] **Első sikeres `./gradlew assembleDebug` build** — `app-debug.apk` (~4,2 MB),
      elküldve neked közvetlenül. Nem Play Store-aláírású, telepítéskor
      "ismeretlen forrásból telepítés" engedély kell hozzá a telefonon
  - Útközbeni hiba, amit megoldottam: `java.io.IOException: Unable to establish
    loopback connection` — a Windows `%TEMP%` rövid (8.3) elérési útja
    (`TEB283~1`) összezavarta a JDK 21 új Unix-domain-socket alapú Gradle
    daemon-kommunikációját. Megoldás: a build közben `TEMP`/`TMP` egy rövid,
    tiszta útvonalra (`C:\gradletemp`) mutat
  - Egy tranziens hálózati timeout (`dl.google.com`) is közbejött, újrapróbálásra
    lement
- [ ] Ikon-/splash-generálás: a `@capacitor/assets` csomagot kipróbáltam, de a
      függőségi fájában kritikus, javítás nélküli sebezhetőség volt (`node-tar`
      hardlink/symlink traversal) — eltávolítva, nem maradt a projektben.
      A jelenlegi build a Capacitor alapértelmezett ikonjával/splash-ével megy,
      a sajátunk (`public/icon-*.svg`) még nincs натívra konvertálva
- [ ] Aláíró kulcs (release keystore), valódi eszközteszt, akkumérés — ezek
      továbbra is hátravannak

**Hogyan reprodukálható/futtatható tovább:**
```bash
cd android
JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot" \
PATH="$JAVA_HOME/bin:$PATH" ANDROID_HOME=/c/Android/sdk \
TEMP="C:\gradletemp" TMP="C:\gradletemp" \
./gradlew assembleDebug --no-daemon
```
- **Aláíró kulcs (keystore) létrehozása** — ha ez elvész, az alkalmazás soha többé nem
  frissíthető. Biztonságos mentést is beállítok, és megmutatom, hova tetted
- Valódi eszközös teszt: gyenge telefon, kis képernyő, repülő mód, app-váltás,
  bejövő hívás közben
- **Csalás-teszt**: rendszeróra előre állítása ne adjon végtelen offline pénzt
- Akkuhasználat mérése (a 60 ms-os tick nem lehet processzorzabáló)
- iOS build, ha a Nap 5-ös döntés az volt

---

## Nap 7 — Store-oldal és kiadás

- Ikon 3 változatban (A/B teszthez), 6 feliratos képernyőkép, 15-30 mp-es videó
- Cím és leírás kulcsszavakkal: *idle, tycoon, restaurant, sushi, manager*
- Adatvédelmi tájékoztató publikálása (GitHub Pages elég hozzá)
- Play Console: adatbiztonsági űrlap, korhatár-kérdőív, tartalmi besorolás
- **Web verzió élesítése** (Netlify/Vercel, 5 perc, nincs jóváhagyás) — ez az azonnali platform
- Feltöltés belső tesztre, majd nyílt tesztre
- Analitika-dashboard: D1, D7, ARPDAU, reklámnézés/DAU

---

## Ütemezési kockázat, amit most kell tudnod

**A Google Play új fejlesztői fiókoknál 12 tesztelővel, 14 napig tartó zárt tesztet
követelhet meg az éles kiadás előtt.** Ez azt jelenti, hogy a 7. napon **nem lesz
éles Play Store-os megjelenés** — hanem elindul a tesztfolyamat.

Amit ezzel kezdek:
1. A **web verzió** a 7. napon élesben elérhető lesz, jóváhagyás nélkül. Ezen mérünk
   először retentiont és bevételt.
2. A Play zárt tesztje a 7. napon indul, tehát a 3. hét elején lehet éles.
3. Ha van 12 ismerősöd, aki telepíti, azzal a folyamat gyorsul.

**Ezért nem éri meg fizetett hirdetést indítani a 7. napon** — előbb legyen adat arról,
hogy a játékos maradna-e ingyen is.

---

## Ahogy dolgozni fogok

- **Minden nap végén**: zöld build, végigtesztelt új rendszer, frissített dokumentáció
- **Minden balansz-változtatás előtt**: szimuláció, nem érzés (`node tools/balance-sim.mjs`)
- **Minden új rendszer**: tiszta logika külön modulban, hogy tesztelhető legyen
- Amit nem tudok eldönteni helyetted (fiókok, pénz, iOS igen/nem), azt **előre jelzem**,
  nem a határidő előtt

## Amit szándékosan NEM csinálok

| Nem csinálom | Miért |
|---|---|
| Loot box, szerencsekerék | Szabályozási kockázat több EU-országban, cserébe a bevétel pár százaléka |
| Saját backend, felhasználói fiókok | Szerverköltség és GDPR-teher az első verzióban; a liga szimulált ellenfelekkel megoldható |
| Kényszerített reklám indításkor | A legnagyobb D1-gyilkos |
| Több nyelv | Az angol lokalizáció a kiadás utáni első patch, nem előtte |
| Egyedi grafika | 0 Ft art budget — emoji + CSS, ez tudatos döntés |

---

## Mikor mondhatjuk, hogy sikerült

A kiadás utáni 2. hét adatai alapján:

| Metrika | Cél | Ha nem jön össze |
|---|---|---|
| D1 retention | > 35% | A bevezetés a hibás — rövidíteni az első manager és az első műszak közti utat |
| D7 retention | > 12% | Nincs elég hosszú távú cél — több végjáték-tartalom kell |
| ARPDAU | > $0,05 | Kevés vagy rosszul elhelyezett a jutalmazott reklám |
| Reklámnézés / DAU | 6-10 | A jutalom nem elég vonzó |

1 000 napi aktív játékossal ez nagyjából **$2 200-2 400 havi bevétel** — a részletes
számítás a [UZLETI-MODELL.md](UZLETI-MODELL.md)-ben.
