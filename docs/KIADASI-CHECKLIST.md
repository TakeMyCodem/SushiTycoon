# Kiadási checklist

## 0. Web (a leggyorsabb út — ma is élesíthető)

- [x] `npm run build`
- [x] `dist/` feltöltése — Netlify/Vercel helyett GitHub Pages lett (ugyanaz a végeredmény, ingyenes,
      már be van kötve GitHub Actionsbe: minden `main`-re push újraépíti és kiteszi)
      → **https://takemycodem.github.io/SushiTycoon/**
- [x] HTTPS ellenőrzése — GitHub Pages alapból HTTPS, a service worker működik rajta
- [x] Telefonon: „Hozzáadás a kezdőképernyőhöz" teszt — a manifest/SW útvonalak javítva az
      alkönyvtáras (`/SushiTycoon/`) kiszolgáláshoz, ellenőrizve élesben

Nincs jóváhagyás, nincs díj. Itt lehet a legolcsóbban tesztelni, hogy a játék megfogja-e az embereket.

## 1. Google Play (Android)

**Egyszeri költség: $25.**

- [ ] Fejlesztői fiók, azonosság-igazolás (2-3 nap átfutás!)
- [ ] `npx cap add android`, majd `npm run android`
- [ ] Csomagnév véglegesítése: `com.sushiempire.idle` — **utólag nem változtatható**
- [ ] Verziószám és `versionCode` beállítása
- [ ] Aláíró kulcs (upload keystore) + **Play App Signing** bekapcsolása
- [ ] `.aab` (Android App Bundle) build, nem `.apk`
- [ ] Adatbiztonsági űrlap: mit gyűjt a reklám-SDK (ezt az SDK dokumentációja adja meg)
- [ ] Tartalmi besorolás kérdőív
- [x] Adatvédelmi tájékoztató URL — kész: https://takemycodem.github.io/SushiTycoon/privacy.html
- [ ] Belső teszt → zárt teszt → nyílt teszt → éles
      (új fiókoknál **12 tesztelő × 14 nap** zárt teszt kötelező lehet — ezzel tervezz!)

## 2. App Store (iOS)

**Éves költség: $99. macOS + Xcode szükséges.**

- [ ] Apple Developer Program tagság
- [ ] `npx cap add ios`, Xcode-ban aláírás beállítása
- [ ] App Store Connect: alkalmazás létrehozása, IAP termékek felvétele
- [ ] **„Vásárlások visszaállítása" gomb kötelező** — enélkül elutasítás
- [ ] Adatvédelmi címkék (App Privacy) kitöltése
- [ ] TestFlight teszt
- [ ] Beküldés — 1-3 nap átfutás, számíts 1 elutasításra

## 3. Kiadás előtti utolsó ellenőrzés

- [ ] Repülő módban is elindul és játszható
- [ ] App bezárás/újranyitás után a mentés megmarad
- [ ] Óra átállítása előre nem ad végtelen pénzt
- [ ] Minden reklámhely megjelenik és jutalmaz (teszt-azonosítókkal)
- [ ] Minden IAP megvehető sandboxban, és a vásárlás visszaáll újratelepítés után
- [x] Kis képernyőn (360×640, 375px) sem lóg ki semmi — ellenőrizve minden fülön/al-fülön
- [ ] Notch-os iPhone-on nem takarja a felső sávot semmi (valódi eszköz kell hozzá, Nap 6)
- [x] A játék nem fagy 1e30 feletti számoknál — élesben tesztelve 1e99-ig, a `fmt()` tudományos
      jelölésre vált 1e80 fölött, nincs `NaN`/`Infinity`

## 4. Kiadás után — az első hét

| Nap | Teendő |
|---|---|
| 1-2 | Összeomlások figyelése (Crashlytics), azonnali hotfix |
| 3 | Első retention adatok — ha D1 < 25%, az onboarding a hibás |
| 5 | Reklámhelyek finomhangolása a mért nézettség alapján |
| 7 | Első tartalmi patch kiadása — a store algoritmusa díjazza a frissítést |

**Ne indíts fizetett kampányt az első 2 hétben.** Előbb legyen adatod arról,
hogy a játékos maradna-e ingyen is.
