# TimeHolder

Minimalistická PWA aplikácia na zaznamenanie pracovného dňa: **príchod**, **prestávka**, **koniec prestávky** a **odchod**. Projekt je navrhnutý ako malá, rýchla a offline použiteľná aplikácia s jednoduchým ovládaním na mobile.

> Interný npm názov projektu je zatiaľ `timetrack`, používateľský názov aplikácie je `TimeHolder`.

## Stav projektu

Aktuálna verzia: **1.7.0**

Stav po **1.7.0** (2026-09-07), od [v1.5.3](docs/retrospective-v1.5.3.md)
pozri [docs/retrospective-v1.7.0.md](docs/retrospective-v1.7.0.md).

Dnes v appke:

- týždenný prehľad Po–Ne (príchod / odchod, dole prestávka · v práci)
- fond týždňa = 5 × denný fond (8 h → 40 h; 7 h → 35 h; 9 h → 45 h)
- HO pečiatka 08:00 / 12:00–12:30 / 16:30 (vždy 8 h)
- Preskočiť + vypnutá reálna prestávka = stále minúty z nastavení (default 30)
- karty Deň / Nastavenia / Dáta, `work_settings`, export JSON
- 186 testov, ktoré importujú produkčný kód
- Vite, PWA, archív `archive/timetrack_v1.7.0.zip`

V pláne (poradie):

1. GitHub `zrebec/timeholder` — push len zo súkromného účtu (pozri Git nižšie)
2. Import JSON starej histórie ([handover/IDEAS.md](handover/IDEAS.md) ID-009)
3. Toast „Nová verzia — obnoviť“ (TT-003)
4. Notifikácia odchodu (TT-002)
5. Heuristika 16 h, maskable ikony, zjednotenie Node, 4-dňový týždeň neskôr

## Funkcie

- zadanie času príchodu, prestávky a odchodu
- tlačidlo **TERAZ** pre rýchle nastavenie aktuálneho času
- tlačidlo **Preskočiť** — prestávka sa nezapisuje, pri vypnutom checkboxe sa stále odpočíta fond prestávky
- tlačidlo **HO** — statický deň 08:00 / 12:00–12:30 / 16:30 (8 h)
- tlačidlo **Späť** pre opravu poslednej udalosti
- živý výpočet času v práci a času do plánovaného odchodu
- varovanie pri skorom odchode
- sumár dňa po ukončení
- týždenný prehľad Po–Ne (príchod, odchod; dole prestávka a odpracované)
- tmavá/svetlá téma
- haptic feedback tam, kde ho prehliadač podporuje
- základná accessibility vrstva: `aria-label`, `role="spinbutton"`, `aria-live`, `focus-visible`
- tri karty: **Deň** (default), **Nastavenia** (fond / prestávka / najskorší odchod), **Dáta** (export JSON)
- nastavenia v `localStorage` kľúči `work_settings` — `work_records` sa z nich nezapisujú

## Pravidlá výpočtu

Predvolené pravidlá sú v `scripts/time-math.js` a v `scripts/settings.js`.
Používateľ ich vie zmeniť na karte Nastavenia; garbage hodnoty padnú na default.

```js
export const WORK_HOURS = 8;
export const BREAK_MINUTES = 30;
export const EARLIEST_DEPARTURE_MINUTES = 15 * 60; // 15:00
export const USE_ACTUAL_BREAK_TIME = false;
```

Význam:

- pracovný deň má štandardne 8 hodín
- prestávka sa štandardne počíta ako 30 minút
- kým prestávka nie je rozhodnutá, plánovaný odchod počíta s minútami z nastavení
- **Preskočiť** pri vypnutej reálnej prestávke stále odpočíta minúty z nastavení (default 30); odchod ostáva príchod + fond + prestávka
- týždenný fond je 5 × denný fond (Po–Pi); HO je vždy 8 h
- najskorší rovnakodenný odchod je 15:00
- nočné zmeny sú podporované cez absolútne minúty a prechod cez polnoc
- pri `USE_ACTUAL_BREAK_TIME = false` sa vždy odpočítava fixných 30 minút, nie skutočná dĺžka prestávky

Príklad:

| Príchod | Prestávka |      Plánovaný odchod |
| ------- | --------: | --------------------: |
| 08:00   |    30 min |                 16:30 |
| 06:30   |    30 min |                 15:00 |
| 22:00   |    30 min | 06:30 nasledujúci deň |

## Technológie

- HTML/CSS/JavaScript
- čisté ES modules
- Vite
- Node.js test runner bez externej testovacej knižnice
- Service Worker + Web App Manifest

## Inštalácia

Požiadavky:

- Node.js 20+
- npm

```bash
npm install
```

Pre CI a čisté prostredie používaj:

```bash
npm ci
```

## Skripty

```bash
npm run dev      # spustí Vite dev server na porte 5500
npm test         # spustí testy
npm run build    # vytvorí produkčný build do dist/
npm run preview  # lokálny preview produkčného buildu
```

## Testy

Testy sú v adresári `tests/` a používajú minimalistický framework v `tests/_framework.js`.

```bash
npm test
```

Aktuálny stav:

```text
Passed: 186
Failed: 0
Total:  186
```

Pokryté oblasti:

- formátovanie minút a času
- striktný parser `HH:MM`
- odmietnutie neplatných časov ako `24:00`, `12:60`, `08:30:00`, `8:30`
- prechod cez polnoc pomocou `toAbsMin`
- plánovaný odchod pri skorom príchode a nočnej zmene
- výpočet odpracovaného času pred prestávkou, počas prestávky a po prestávke
- poškodené alebo neúplné záznamy z `localStorage`
- validácie pre prestávku a odchod
- warning pri skorom odchode
- sanitize nastavení (fond 1–23, prestávka 1–120, HH:MM, boolean)
- plánovaný odchod so settings argumentom
- export payload (`records` 1:1, bez settings)
- týždeň Po–Ne: 5× denný fond, HO, uzavreté kúsky, playtest scenáre

## Architektúra

```text
timetrack/
├── index.html
├── styles.css
├── package.json
├── package-lock.json
├── vite.config.js
├── scripts/
│   ├── main.js          # bootstrap, event wiring, service worker registration
│   ├── ui.js            # DOM, karty, stav, handlery
│   ├── time-math.js     # čisté časové výpočty
│   ├── validation.js    # čisté validátory
│   ├── settings.js      # sanitize + work_settings
│   ├── storage.js       # work_records / theme / export
│   ├── playtest-weeks.js
│   └── dev-seed.js      # DEV ?seed=
├── tests/
│   ├── _framework.js
│   ├── run.js
│   ├── time-math.tests.js
│   ├── week-scenarios.tests.js
│   ├── validation.tests.js
│   ├── settings.tests.js
│   └── storage.tests.js
├── public/
│   ├── sw.js
│   ├── manifest.json
│   ├── site.webmanifest
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   └── icons/
│       ├── android-chrome-192x192.png
│       └── android-chrome-512x512.png
├── docs/
│   ├── retrospective-v1.5.2.md
│   ├── retrospective-v1.5.3.md
│   └── retrospective-v1.7.0.md
├── handover/            # živý backlog: issues, nápady, pravidlá, log
├── AGENTS.md            # zmluva pre kódovacích agentov
├── CLAUDE.md            # Claude Code wrapper nad AGENTS.md
└── .github/workflows/
    └── ci.yml
```

## Práca s agentmi

Kanonické pravidlá sú v [AGENTS.md](AGENTS.md). Čo agent smie a nesmie
(matica adresárov, CI, git) je v [handover/RULES.md](handover/RULES.md).
Otvorené problémy a nápady sa zapisujú do [handover/](handover/), nie do
retrospektív. Agent **nikdy nezapisuje do `main`** a **nikdy nepushuje** —
commit len na vetve z `main`; push, PR a pull do `main` robíš ty.

## Dáta v localStorage

Aplikácia používa `localStorage` kľúče:

- `work_records` — história dní (nemeň tvar, settings/export ho nezapisujú)
- `work_settings` — fond, prestávka, najskorší odchod, skutočná prestávka
- `theme`, `last_table_date`

`work_records`:

Približný tvar dát:

```json
{
  "2026-06-09": {
    "arrival": "08:00",
    "break_start": "12:00",
    "break_end": "12:30",
    "departure": "16:30"
  }
}
```

Denná tabuľka sa viaže na kľúč `last_table_date`.

## PWA a service worker

Service worker je v `public/sw.js`.

Dôležité body:

- cache názov je `TimeHolder-v1.7.0`
- pri zmene verzie je potrebné bumpnúť `CACHE_NAME`
- dev prostredia `localhost`, `127.*`, `192.168.*`, `10.*`, `172.16-31.*` obchádzajú cache
- statické súbory sa precachujú pri install evente
- ostatné GET requesty sa cachujú runtime spôsobom

Pozor: projekt zatiaľ nemá používateľsky viditeľný update flow typu „Nová verzia je dostupná — obnoviť“.

## GitHub Pages

`dist/` sa **necommituje**. Po pushi na `main` workflow
`.github/workflows/pages.yml` spraví `npm ci && npm test && npm run build`
a nasadí `dist/`. V repozitári: Settings → Pages → Source: **GitHub Actions**.

GitHub z vetvy nevie priečinok `/dist` (len `/` alebo `/docs`). Actions
je správna cesta. URL bude `https://zrebec.github.io/timeholder/`
(`base: './'` v Vite).

## GitHub Actions

Workflow `.github/workflows/ci.yml` robí:

1. checkout
2. setup Node.js 20
3. `npm ci`
4. `npm test`
5. `npm run build`
6. upload `dist/` ako artifact
7. na `main` ešte Pages deploy (samostatný workflow)

## Známe trade-offy

### Nočné zmeny vs. detekcia omylu

Funkcia `toAbsMin(rawMin, arrivalMin)` berie čas menší než príchod ako čas po polnoci. To umožňuje nočné zmeny:

```text
arrival 22:00, now 02:00 → 02:00 sa berie ako 26:00 absolútne
```

Nevýhoda: aplikácia nevie vždy rozlíšiť, či používateľ zadal skutočný čas po polnoci alebo denný omyl.

### iOS a vibrácie

`navigator.vibrate` na iOS Safari nefunguje ani v nainštalovanej PWA. Kód má feature detection, takže na nepodporovaných platformách ticho neurobí nič.

### Nastavenia vs. história

Karta Nastavenia zapisuje len `work_settings`. Export na karte Dáta históriu len číta.
`00:00` ako najskorší odchod vypne podlahu 15:00.

## Git (len tento adresár)

Remote už existuje: [github.com/zrebec/timeholder](https://github.com/zrebec/timeholder)
(ešte drží staršiu verziu). **Global `user.name` / `user.email` sa tu
nesmú použiť** — to je firemné konto.

V tomto repo sú lokálne (nie `--global`):

```text
user.name  = zrebec
user.email = zrebec@zrebec.sk
```

Agent **nepushuje**. Push, PR a merge do `main` robíš ty, prihlásený ako
`zrebec`, nie firemným GitHubom. Aby sa heslá/tokeny na `github.com`
nepomiešali, v tomto adresári je `credential.useHttpPath=true`.

## Odporúčané ďalšie kroky

1. Push vetvy na `zrebec/timeholder` (súkromný účet; starý `main` na GitHubе
   je pred 1.7.0 — merge alebo nahradenie je na tebe)
2. Import JSON na karte Dáta (stará PWA na iPhone)
3. service worker update toast
4. notifikácia „môžeš ísť domov“
5. heuristika 16 h pre omyl vs. nočná zmena
6. zjednotenie Node (README 20+ vs. CI 24)
7. 4-dňový týždeň / fond 7,5 h — neskôr
8. Playwright smoke, maskable ikony — polish

## Release checklist

Pred release:

```bash
npm ci
npm test
npm run build
```

Potom skontrolovať:

- číslo verzie v `package.json`
- `CACHE_NAME` v `public/sw.js`
- stav testov v README
- PWA manifest
- či build funguje z relatívnej cesty/subfoldera
