# Kiadási checklist

## 0. Web (a leggyorsabb út — ma is élesíthető)

- [ ] `npm run build`
- [ ] `dist/` feltöltése Netlify / Vercel / Cloudflare Pages-re (drag & drop is elég)
- [ ] HTTPS ellenőrzése — service worker nélküle nem működik
- [ ] Telefonon: „Hozzáadás a kezdőképernyőhöz" teszt

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
- [ ] Adatvédelmi tájékoztató URL
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
- [ ] Kis képernyőn (360×640) sem lóg ki semmi
- [ ] Notch-os iPhone-on nem takarja a felső sávot semmi
- [ ] A játék nem fagy 1e30 feletti számoknál

## 4. Kiadás után — az első hét

| Nap | Teendő |
|---|---|
| 1-2 | Összeomlások figyelése (Crashlytics), azonnali hotfix |
| 3 | Első retention adatok — ha D1 < 25%, az onboarding a hibás |
| 5 | Reklámhelyek finomhangolása a mért nézettség alapján |
| 7 | Első tartalmi patch kiadása — a store algoritmusa díjazza a frissítést |

**Ne indíts fizetett kampányt az első 2 hétben.** Előbb legyen adatod arról,
hogy a játékos maradna-e ingyen is.
