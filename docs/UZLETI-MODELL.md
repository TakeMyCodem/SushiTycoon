# Üzleti modell — hogyan lesz ebből pénz

> Rövid válasz: **hibrid modell**. A bevétel ~60-70%-a reklámból, ~30-40%-a
> mikrotranzakcióból jön. A reklám fizeti a felhasználószerzést, az IAP a profitot.

## 1. A három bevételi forrás

### A) Rewarded video (jutalmazott reklám) — a gerinc

A játékos **önként** néz meg egy 15-30 mp-es videót, cserébe kap valamit.
Ez a legjobban konvertáló forma: nem zavaró, ezért nem kergeti el a játékost.

A négy beépített hely (`src/game/monetization.ts` → `RewardedPlacement`):

| Hely | Mikor | Miért működik | Várható napi nézés/DAU |
|---|---|---|---|
| `offline_double` | Visszatéréskor: "duplázd az offline bevételt" | A játékos épp most kapott ingyen pénzt — a duplázás fájdalommentes | 1-2 |
| `income_boost` | x3 bevétel 4 percre (Bolt fül) | Aktív játék közben, önként hívott | 3-6 |
| `shift_double` | Duplázd a műszak-jutalmat | A műszak végén, épp lezárt teljesítmény után — a legjobb pillanat kérni | 2-4 |
| `skip_cooldown` | Várakozás átugrása a következő műszakig | Türelmetlenségre árazva | 0-2 |

**Számolás:** 6-10 nézés/DAU/nap reális egy jól hangolt idle-nél.
Rewarded eCPM (2026, tier-1 országok): **$10-18**, globálisan vegyesen **$6-9**.

> 1 000 DAU × 7 nézés × $8 eCPM / 1000 = **~$56 / nap** = ~$1 700 / hó

### B) Interstitial (teljes képernyős) — óvatosan

Prestige után és 3+ perces session-eknél, **maximum 4 percenként**.
eCPM $6-12, de rontja a retention-t. A `noads` IAP-ot vásárlóknál teljesen ki van kapcsolva.

Ökölszabály: az interstitial a bevétel ~15%-át adja és a lemorzsolódás ~10%-át okozza.
Ha méred és rosszul jön ki, **kapcsold ki**.

### C) IAP — a profit

A katalógus a `monetization.ts`-ben van, 1:1 másolható a store-konzolba:

| SKU | Ár | Mit ad | Szerep |
|---|---|---|---|
| `starter` | $4.99 | 250💎 + 4 óra termelés + reklámmentes | **A legfontosabb.** Egyszeri, limitált ajánlat, az első fizetés küszöbét töri át |
| `gems_small` | $1.99 | 100💎 | Belépő |
| `gems_large` | $19.99 | 1200💎 (+20%) | A "whale"-ek itt vesznek |
| `noads` | $3.99 | Reklámmentesség | A reklámot utálók megtartása pénzért |
| `vip` | $9.99 | x2 bevétel örökre + 24h offline + 500💎 | A legjobb LTV/ár arány |

Iparági benchmark casual idle-nél: **1,5-3% fizető arány**, ARPPU $8-15.

> 1 000 DAU × 2% × $10 = **~$200 / hó** (a fizetők nem naponta vesznek, ez havi becslés)

### Összesítés 1 000 DAU-ra

| Forrás | Havi bevétel |
|---|---|
| Rewarded | ~$1 700 |
| Interstitial | ~$300 |
| IAP | ~$200-400 |
| **Összesen** | **~$2 200-2 400 / hó** |

Ez **ARPDAU ≈ $0,07-0,08** — reális, konzervatív érték egy jól hangolt idle-nél.
A skálázás lineáris: 10 000 DAU ≈ $22 000/hó.

## 2. Ahol a pénz valójában eldől: a felhasználószerzés

A játék minősége itt válik pénzzé. Két út:

**Organikus (0 Ft, lassú).** ASO + TikTok/Shorts. Az idle játékok
"kielégítő szám-növekedés" videói jól mennek. Napi 2-3 rövid videó,
6-8 hét alatt épít fel néhány ezer letöltést. **Ezzel kezdj.**

**Fizetett (skálázható).** Csak akkor kapcsold be, ha a mért **D1 retention > 35%**
és az **ARPDAU > $0,05**. Alatta minden elköltött forint elveszik.
Amikor bekapcsolod, a szabály: `LTV(30 nap) > CPI × 1,3`.

Casual idle CPI 2026-ban: **$0,4-1,2** (tier-2/3 országok jóval olcsóbbak).

## 3. A három szám, amit naponta nézni kell

| Metrika | Cél | Ha alatta van |
|---|---|---|
| **D1 retention** | > 35% | Az onboarding rossz. Rövidítsd az első manager megszerzését. |
| **D7 retention** | > 12% | Nincs elég hosszú távú cél. Több prestige-tartalom kell. |
| **ARPDAU** | > $0,05 | Túl kevés a rewarded hely, vagy nem elég vonzó a jutalom. |

Az `analytics.ts` már minden szükséges eseményt lő — csak SDK-t kell mögé tenni.

## 4. Jogi és compliance (ezt ne hagyd ki)

- **Adatvédelmi tájékoztató** kötelező, mindkét store megköveteli. Statikus oldal is elég —
  ez már **kész**: [privacy.html](https://takemycodem.github.io/SushiTycoon/privacy.html).
- **GDPR/CMP:** EU-s felhasználóknál hozzájárulás-kezelő kell (a Google UMP SDK ingyenes) —
  natívon az AdMob-csomag beépített formája intézi, weben egy saját `ConsentBanner` van kész.
- **Gyerekek:** ne célozd 13 év alattiakat, különben COPPA/Family Policy szabályok élnek.
  Az App Store korhatár: 4+, de akkor a reklámoknak nem-perszonalizáltnak kell lenniük.
- **Szerencsejáték-jelleg:** nincs loot box a játékban, szándékosan. Ez elkerül egy egész
  szabályozási területet (több EU-ország korlátozza).
- **Vállalkozás:** a store-fiókhoz adószám kell; a bevétel utáni adózás a te oldaladon rendezendő.

## 5. Reális elvárás

**1 hét fejlesztés nem hoz azonnali pénzt.** A hét végére kész terméked lesz,
ami kiadható. A bevétel a kiadás utáni 4-8. hétben indul be, ha a retention jó.

A legnagyobb kockázat nem a kód, hanem a láthatóság: naponta több száz idle játék jelenik meg.
Ezért a hét utolsó napja **teljes egészében** a store-oldal (ikon, screenshotok, videó) —
az hozza a letöltést, nem a kód.
