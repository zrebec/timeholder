# TimeHolder — inštrukcie pre agentov

Používateľský názov aplikácie je **TimeHolder**. Interný npm názov je `timetrack`.
Aktuálna verzia: **1.7.0**. UI a dokumentácia sú po slovensky.

Tento súbor je zmluva medzi projektom a každým kódovacím agentom
(Grok, Claude, Cursor, Codex, Copilot). Podrobná matica adresárov je v
[handover/RULES.md](handover/RULES.md). Otvorené veci žijú v
[handover/ISSUES.md](handover/ISSUES.md).

## Pred každou prácou

1. Prečítaj [handover/RULES.md](handover/RULES.md) — vrátane git toku.
2. Pozri otvorené položky v [handover/ISSUES.md](handover/ISSUES.md) a
   [handover/IDEAS.md](handover/IDEAS.md).
3. Ak existuje `.git` a si na `main`/`master`, **pred prvým commítom**
   odboč novú vetvu z `main`. Na `main` sa necommituje.
4. Pri session, ktorá mení kód alebo rozhodnutia, dopíš záznam do
   [handover/LOG.md](handover/LOG.md).
5. Nemeň rozsah nad to, čo používateľ požiadal. Väčší refactor navrhnúť, nie ticho spraviť.

## Čo toto je

Minimalistická **PWA** na evidenciu pracovného dňa: príchod → prestávka →
koniec prestávky → odchod. Funguje offline, je mobile-first, počíta plánovaný
odchod z konštánt v `scripts/time-math.js`. Stav je v `localStorage`, nie na serveri.

Žiadny backend. Žiadny framework. Čisté ES moduly + Vite + vlastný test runner.

## Príkazy

```bash
npm ci              # čistá inštalácia (CI aj lokálne pred release)
npm run dev         # Vite dev server, port 5500, --host pre telefón v LAN
npm test            # node tests/run.js — musí prejsť pred odovzdaním zmeny
npm run build       # produkčný výstup do dist/ (generované, necommituje sa)
npm run preview     # overenie buildu
npm run format      # Prettier write
npm run format:check
npm run archive     # build + zip do archive/ — len na požiadanie
```

Node: README hovorí 20+, CI používa 24. Kým sa to nezjednotí, nelom CI.

## Mapa projektu

| Cesta | Účel |
| ----- | ---- |
| `index.html` | Vite entry, slovenské UI, žiadne inline handlery |
| `styles.css` | jediný stylesheet |
| `scripts/main.js` | bootstrap, event wiring, registrácia SW |
| `scripts/ui.js` | DOM, stav, karty, handlery |
| `scripts/time-math.js` | čisté časové výpočty, default konštanty |
| `scripts/validation.js` | čisté validátory `{ ok, error?, warning? }` |
| `scripts/settings.js` | sanitize + `work_settings` (nikdy nezapisuje `work_records`) |
| `scripts/storage.js` | `work_records` / theme / `last_table_date`, export payload |
| `scripts/playtest-weeks.js` | čisté fixture týždne pre testy a DEV seed |
| `scripts/dev-seed.js` | `?seed=` len v DEV_MODE |
| `scripts/archive-project.mjs` | zip skript, nie runtime app |
| `tests/` | `*.tests.js` importujú produkčný kód |
| `public/` | PWA statika; Vite ju skopíruje 1:1 do `dist/` |
| `docs/` | retrospektívy — história, neprepisovať |
| `handover/` | živý backlog issues / nápadov / log |
| `.github/workflows/ci.yml` | `npm ci` → `npm test` → `npm run build` |
| `archive/` | historické zip/7z — nemeniť ručne, **nie v gite** |
| `dist/` | generovaný výstup Vite — nikdy needitovať ani committovať |
| `build/` | starý názov výstupu; ignorovať, keby ostal na disku |
| `node_modules/` | nikdy needitovať |

## Architektúra, ktorú treba zachovať

- **Jeden zdroj pravdy.** Testy importujú `scripts/*.js`. Nikdy nekopírovať
  produkčné funkcie do testov.
- **Čisté jadro.** `time-math.js` a `validation.js` nesmú sahat na DOM,
  `localStorage`, `window` ani `Date.now()`. Čas „teraz“ im predáva caller.
- **Side effecty.** `time-math.js` a `validation.js` ostávajú čisté.
  `storage.js` vlastní `work_records`; `settings.js` vlastní `work_settings`.
  `ui.js` ich volá, neparsuje `localStorage` priamo.
- **`main.js` len wire-uje.** Žiadna business logika, žiadne `onclick` v HTML.
- **Polnoc.** `toAbsMin` berie čas menší než príchod ako nasledujúci deň.
  Nočné zmeny sú feature, nie bug. Nemeň to bez testov a bez issue.
- **Konštanty dňa** defaultujú na 8h / 30min / 15:00 / false. Runtime hodnoty
  idú cez `settings.js` (`work_settings`). `time-math` berie voliteľný
  settings argument; bez neho sa správa ako defaulty. Defaulty v kóde nemeň.
- **Časová zóna** je `Europe/Bratislava`. Nemeň bez požiadavky.
- **Vite** používa `base: './'` a **stabilné filename** bez hashu.
  Cache busting je `CACHE_NAME` v `public/sw.js`.
- **SW sa neregistruje v DEV_MODE** (localhost, 127.*, LAN rozsahy).
- **localStorage kľúče:** `work_records`, `last_table_date`, `theme`,
  `work_settings`. Tvar dňa: `{ "YYYY-MM-DD": { arrival, break_start, break_end, departure, break_skipped?, home_office? } }`.
  `work_records` nemeň tvar a z nastavení/exportu ho nezapisuj.
  Nekompatibilnú zmenu formátu nerob bez migrácie a issue.

## Pravidlá kódu

- UI texty po slovensky. Identifikátory v kóde po anglicky.
- Žiadny React, Vue, Svelte, TypeScript, Vitest, Jest, Tailwind — kým to
  používateľ výslovne neschváli. Ďalší modul = ďalší ES súbor.
- Žiadny backend, auth, ani cloud sync bez požiadavky.
- Nová logika v `time-math` / `validation` ide s testom v párovom `*.tests.js`.
- Po zmene čistých funkcií spusti `npm test`. Po UI zmene over aj `npm run build`.
- Komentáre len tam, kde vysvetľujú neintuitívne obmedzenie (iOS, polnoc, SW).
- Prettier je formatter. Nerieš style nity mimo neho.
- Prístupnosť: `aria-label` na icon-only tlačidlách zachovať.
  `role="spinbutton"` na digitoch je vedomé rozhodnutie — nemeň na
  `<input type="number">` (mobilná klávesnica by zlomila UX).
- Haptic: `navigator.vibrate` s feature detection. Na iOS to nefunguje a nemá.

## Release (keď ťa oň požiadajú)

1. `npm ci && npm test && npm run build`
2. Zosúladiť verziu v `package.json` a `CACHE_NAME` v `public/sw.js`
3. Skontrolovať README (verzia, počet testov)
4. Manifest a relatívne cesty v builde
5. Archivovať len cez `npm run archive`, nie ručným kopírovaním do `archive/`

## Handover

Nový bug, dlh, nápady a rozhodnutia zapisuj do `handover/`.
Formát a ID schéma sú v [handover/README.md](handover/README.md).
Nemeň `docs/retrospective-*.md` spätne; novú vlnu dokumentuj novým súborom
alebo v handoveri.

## Tvrdé zákazy

- Needituj `dist/`, `build/`, `node_modules/`, binárne zip/7z v `archive/`.
- `archive/` sa necommituje. GitHub Pages ide cez Actions z `dist/`, nie z commitu.
- Nemaž cudzie histórie v `docs/` ani uzavreté handover záznamy.
- Nepridávaj hashované asset mená vo Vite.
- Neregistruj service worker na LAN IP pri `vite dev`.
- Nekomituj tajomstvá. Tento projekt žiadne API kľúče nepotrebuje.
- **Nikdy nezapisuj do `main`.** Commit len na samostatnej vetve odbočenej
  z `main`. **Nikdy `git push`.** Pull request do `main` a `git pull` naspäť
  robí používateľ. Postup: [handover/RULES.md](handover/RULES.md) (sekcia Git).
- `git init` len na výslovnú žiadosť. Len čo `.git` existuje, pravidlo o `main`
  platí hneď.
- **Git identita len v tomto adresári.** `user.name` / `user.email` sa
  nastavujú `--local` (zrebec / zrebec@zrebec.sk). **Nikdy**
  `git config --global` v tomto projekte — global je firemné konto.
  `git push` stále nerobí agent.

## Stav 1.7.0 a ďalší postup

Hotové (2026-09-07): týždeň Po–Ne, HO, fond 5 × denný fond, skip = prestávka
z nastavení pri vypnutom checkboxe, 186 testov, archív
`timetrack_v1.7.0.zip`. Retrospektíva:
[docs/retrospective-v1.7.0.md](docs/retrospective-v1.7.0.md).

Ďalej (agent neskáče sám; čaká na prioritu):

1. Push na `https://github.com/zrebec/timeholder` robí **používateľ**
   súkromným účtom (starý remote ešte drží predchádzajúcu verziu).
2. Import JSON — [ID-009](handover/IDEAS.md)
3. SW update toast — [TT-003](handover/ISSUES.md)
4. Notifikácia odchodu — [TT-002](handover/ISSUES.md)
5. Heuristika 16 h, maskable ikony, Node 20 vs 24, 4-dňový týždeň neskôr
