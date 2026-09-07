# Retrospektíva — v1.5.3

Pohľad na to, čo v1.5.3 priniesla, čo zostalo otvorené, a čo prichádza ďalej.
Nadväzuje na [retrospective-v1.5.2.md](retrospective-v1.5.2.md).

## TL;DR

**v1.5.3 bola architektonická + UX iterácia.** Hlavné dôvody existencie:

1. Mobile UX nebol v poriadku — držanie šípky na iOS vyberalo text namiesto opakovania
2. Tests boli „mŕtve" — kopírovali produkčný kód namiesto importovania
3. Žiadny build step znamenal, že nasadenie nebolo predikovateľné a verzie
   sa rozpadali

Výsledok: app sa stala spravovateľnou (rozdelené moduly, importované testy,
CI workflow, Vite build) bez straty „jednoduchosť ovládania."

## Čo v1.5.3 priniesla

### 1. Haptic feedback (kde sa dá)

- `navigator.vibrate(...)` na všetkých interakciách: 10ms tap na šípkach,
  15ms (`HAPTIC_DEFAULT`) na TERAZ/Späť/Preskočiť, 20ms success,
  vzory [30,60,30] warning a [60,40,60] error
- Funguje na Androide. **Na iPhone nie a nikdy nebude** — iOS Safari
  blokuje Vibration API systémovo, aj v nainštalovanej PWA
- Náhrada pre iOS: silný vizuálny `:active` feedback (scale + filter)

### 2. Accessibility (a11y)

- `aria-label` na všetkých icon-only tlačidlách (▲ ▼ ⏰ ⏭️ ↩️)
- `.digit` elementy ako `role="spinbutton"` s `aria-valuemin/max/now`
- Emoji v action bar obalené v `aria-hidden="true"` (screen reader číta len text)
- `messageBox` ako `role="alert"`, `aria-live="assertive"`
- Live time wrapper `aria-live="off"` (tikanie každú sekundu by rušilo)
- Klávesnicová podpora: `ArrowUp`/`ArrowDown` na fokusovanej digit column
- `:focus-visible` ring (zelená 2px) — fokus viditeľný len pri klávesnici, nie pri myši
- **Vedome odmietnutý lint warning:** `role="spinbutton"` namiesto `<input>` —
  natívny `<input type="number">` by na mobile spustil numerickú klávesnicu
  pri tape, čo by zlomilo interakčný model app-ky

### 3. Mobile UX

- `user-select: none` na `body` (whitelist `.message-box` pre kopírovanie chýb)
- `-webkit-touch-callout: none` — žiadne iOS context menu na long-press
- `touch-action: manipulation` — vypnutý double-tap zoom
- `:active` vizuálny feedback (scale 0.92-0.98, filter brightness)
- `touchcancel` handler — keď iOS preruší dotyk, hold timer sa korektne zastaví

### 4. Modulárny split JS

**Pred:** jeden `script.js` (~490 riadkov)

**Po:** 4 ES moduly v `scripts/`:

- `time-math.js` (~75 riadkov) — čisté funkcie, žiadny DOM
- `validation.js` (~50 riadkov) — pure validátory vracajúce `{ ok, error?, warning? }`
- `ui.js` (~310 riadkov) — DOM, state, storage, handlers
- `main.js` (~60 riadkov) — bootstrap, event wiring, SW registration

Vďaka tomu testy importujú **reálny produkčný kód**, nie jeho kópie.

### 5. Tests s importmi (one source of truth)

- `tests/_framework.js` — shared minimalistic framework
- `tests/time-math.tests.js` — importuje z `../scripts/time-math.js`
- `tests/validation.tests.js` — importuje z `../scripts/validation.js`
- `tests/run.js` — runner, vypíše finálny sumár
- **56 testov, všetky prejdú**

### 6. Vite build system

- `npm run dev` — dev server (port 5500, `--host` pre prístup z telefónu cez LAN)
- `npm run build` — produkčný build do `build/` (stable filenames, žiadny hash)
- `npm run preview` — lokálne overenie buildnutej verzie
- `npm test` — testy bez Vite (čisté Node ESM)
- `vite.config.js`: `base: './'` (relatívne cesty), stable filenames
  (cache busting cez `CACHE_NAME`, nie cez hash)

### 7. Service Worker — runtime cache stratégia

- Precache len statické súbory s predvídateľnými cestami (HTML, manifest, ikony)
- JS/CSS sa cachujú **pri prvom fetch** → imúnne voči Vite hashom
- `isDevEnv()` rozšírený o LAN ranges (`192.168.*`, `10.*`, `172.16-31.*`)
  → SW sa pri `vite dev --host` nezaregistruje aj keď ideš z telefónu

### 8. Reorganizácia statiky

- `public/` — Vite default; všetko sa copy-uje 1:1 do build root
- Ikony rozdelené: favicony + apple-touch ostali v koreni (fallback citlivé),
  `android-chrome-*.png` presunuté do `public/icons/` (referencované len z manifestu)

### 9. Adresárová štruktúra

```
timetrack/
├── index.html              ← Vite entry
├── styles.css              ← Vite optimalizuje
├── package.json, vite.config.js, .gitignore
├── scripts/                ← ES moduly (bundlované)
│   ├── main.js, ui.js, time-math.js, validation.js
├── tests/                  ← *.tests.js per zdrojový súbor
│   ├── _framework.js
│   ├── run.js
│   ├── time-math.tests.js
│   └── validation.tests.js
├── public/                 ← statika, copy-uje sa do build root
│   ├── sw.js, manifest.json, site.webmanifest
│   ├── favicon.*, apple-touch-icon.png
│   └── icons/
│       └── android-chrome-*.png
├── .github/workflows/
│   └── ci.yml              ← GitHub Actions
└── docs/
    ├── retrospective-v1.5.2.md
    └── retrospective-v1.5.3.md
```

### 10. CI workflow (GitHub Actions)

- Triggers: push + PR na `main`
- Node 20, `npm ci`, `npm test`, `npm run build`
- Upload build artifactu (retention 7 dní)

## Známe trade-offs a otvorené veci

### A. iOS Vibration API neexistuje

Nemôžme s tým urobiť nič. Vizuálny `:active` feedback je maximum.
Ak by Apple niekedy povolil Vibration API v PWA, kód je pripravený
(`navigator.vibrate` má feature detection).

### B. `validateBreakStart` „pred príchodom" check je dead code

Po refaktore na `toAbsMin` v1.5.2 sa táto kontrola stala vždy false.
Dôvod: ak je `currentMin < arrivalMin`, `toAbsMin` to posunie o +1440
(predpoklad nočnej zmeny). Trade-off: lepšia podpora nočných zmien
za cenu, že denné omyly sa nezachytia.

**Možné riešenie do budúcna:** heuristika „ak crossing > 16h,
je to omyl, nie nočná zmena."

### C. Nepoužitý `vite-plugin-pwa`

Mohol by pridať auto-update notifikáciu („Nová verzia — klikni pre obnovu"),
ale je to ďalšia dependency. Vlastný SW je naďalej čitateľných ~70 riadkov.
**Kandidát pre v1.6.x** ak sa rozhodne, že SW update flow je dôležitý.

### D. `package-lock.json` je súčasťou repozitára

`package-lock.json` je prítomný, takže `npm ci` v CI vie vytvoriť reprodukovateľnú inštaláciu.
Pri zmene dependencies treba lockfile aktualizovať a commitnúť spolu s `package.json`.

## Splnené ciele z [retrospective-v1.5.2.md](retrospective-v1.5.2.md)

| Bod                | Stav                                           |
| ------------------ | ---------------------------------------------- |
| 4. Accessibility   | ✅ Hotovo                                      |
| 5. Tests opravené  | ✅ Hotovo (one source of truth cez ESM import) |
| 6. Haptic feedback | ✅ Hotovo (Android), ❌ iOS nemožné            |
| 7. Modulárizácia   | ✅ Hotovo (`scripts/` + `tests/`)              |

Otvorené z v1.5.2:

- 1. Settings screen (najväčší UX skok zostáva)
- 2. Notifikácie (PWA vlajková feature)
- 3. SW update flow (auto-update toast)
- 8. Polish detaily (maskable icons, PWA shortcuts, lepšia caching stratégia)

## Kandidáti pre v1.6.x

V poradí podľa hodnoty:

1. **Settings screen** — `WORK_HOURS`, `BREAK_MINUTES`, `EARLIEST_DEPARTURE_MINUTES`,
   `USE_ACTUAL_BREAK_TIME` cez UI. Otvára appku iným ľuďom.
2. **Notifikácie** — „Môžeš ísť domov" o vypočítanom čase odchodu.
3. **SW update flow** — `vite-plugin-pwa` alebo vlastný `controllerchange` handler.
4. **Maskable icons + PWA shortcuts** — manifest polish.

## Poznámka k procesu

V1.5.3 bola dôkaz konceptu „jednoduché ovládanie + komplexná logika je tažké
udržať jednoduché v kóde." Po rozdelení na moduly je čítanie/zmena jednotlivých
častí jednoduchšie ako pred-refaktor `script.js`. Súčasne sa pridala
**testovateľnosť reálneho kódu** namiesto kópií, čo znamená, že budúce zmeny
sú menej rizikové.

Daň: pribudol build step (Vite), `node_modules` (cca 60-80MB), `npm install`
pred prvou prácou. Zdá sa to ako kompromis, ale „bez build kroku" už pri
4 ESM moduloch + plánovanom rozšírení nebol udržateľný.
