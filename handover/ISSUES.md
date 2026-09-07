# Issues

Ďalšie voľné ID: **TT-014**.

Šablóna a stavy sú v [README.md](README.md).

## Otvorené

### TT-002 — PWA notifikácia „môžeš ísť domov“

- Stav: open
- Zdroj: docs
- Oblasť: public/sw.js, scripts/ui.js
- Dátum: 2026-09-02
- Popis: Po vypočítanom čase odchodu má prísť notifikácia. Vyžaduje permission
  prompt a plánovanie. Bez toho je PWA len ikonka na ploche. Závisí na
  permission UX a na tom, či ostávame pri `setTimeout` alebo Notification Triggers.
- Akceptácia: po príchode a so známym planned departure appka vie upozorniť
  v čase odchodu; odmietnuté oprávnenie appku nerozbije.

### TT-003 — Service worker update toast

- Stav: open
- Zdroj: docs
- Oblasť: public/sw.js, scripts/main.js
- Dátum: 2026-09-02
- Popis: Po bumpnutí `CACHE_NAME` používateľ nedostane výzvu, kým PWA úplne
  nezavrie. Chýba `controllerchange` (alebo ekvivalent) + toast
  „Nová verzia — obnoviť“. `vite-plugin-pwa` je kandidát, nie default;
  vlastný SW má ~80 riadkov a má ostať čitateľný, kým plugin neodsúhlasíme.
- Akceptácia: po deploy novej verzie nainštalovaná PWA ukáže výzvu na obnovu.

### TT-004 — `validateBreakStart` nechytí prestávku pred príchodom

- Stav: open
- Zdroj: docs
- Oblasť: scripts/validation.js, scripts/time-math.js
- Dátum: 2026-09-02
- Popis: Po prechode na `toAbsMin` je check „prestávka pred príchodom“ dead
  code — skorší čas sa posunie o +1440 (nočná zmena). Denný omyl
  (príchod 08:00, prestávka 07:00) sa tvári ako prestávka na druhý deň.
  Navrhnutá heuristika: crossing > 16h = omyl, nie nočná zmena.
- Akceptácia: nočné zmeny (22:00 → 01:00) prejdú; zjavný denný omyl spadne
  na error; správanie je pokryté testami.

### TT-005 — Maskable ikony a PWA shortcuts

- Stav: open
- Zdroj: docs
- Oblasť: public/manifest.json, public/icons/
- Dátum: 2026-09-02
- Popis: Manifest nemá `purpose: "maskable"` a nemá shortcuts (napr. rýchly
  príchod). Polish, nie blocker.
- Akceptácia: Android adaptive ikona sa nestrihá zle; v manifeste je aspoň
  jeden zmysluplný shortcut.

### TT-007 — Chýba E2E smoke test hlavného flow

- Stav: open
- Zdroj: docs
- Oblasť: tests/
- Dátum: 2026-09-02
- Popis: Unit testy (80) pokrývajú math/validáciu. Žiadny test neklikne
  príchod → prestávka → odchod v prehliadači. README navrhuje Playwright.
  Nový tool len so súhlasom (pozri RULES).
- Akceptácia: jeden smoke: TERAZ → príchod → skip/prestávka → odchod,
  spustiteľný v CI alebo dokumentovaný ako voliteľný script.

### TT-010 — Node verzia: README 20+ vs. CI 24

- Stav: open
- Zdroj: agent
- Oblasť: README.md, .github/workflows/ci.yml, package.json
- Dátum: 2026-09-02
- Popis: README sľubuje Node 20+. CI pinuje `node-version: "24"`.
  `package.json` nemá `engines`. Riziko „u mňa to ide, v CI nie“.
- Akceptácia: jedna pravda (engines + README + CI) a zdôvodnenie voľby.

## Uzavreté

### TT-011 — Retrospektíva v1.5.3 uvádza 56 testov
- Stav: done (2026-09-07)
- v1.5.3 sa neprepisuje. Aktuálny stav je v retrospective-v1.7.0 (186).

### TT-009 — Workspace nie je git repo
- Stav: done (2026-09-07)
- Lokálny init, `--local` identita zrebec. Push na origin robí používateľ.

### TT-013 — Týždenný kalendár Po–Ne na karte Deň

- Stav: done (2026-09-07)
- Zdroj: user / ID-005
- Oblasť: scripts/time-math.js, scripts/ui.js, index.html, styles.css
- Tabuľka udalostí nahradená Po–Ne (príchod / odchod / odpracované).
  Príchod sa ukáže aj bez odchodu; odchod/`V práci` sú `—` kým deň
  nie je kompletný. Do súčtu a prebytku/deficitu idú len kompletné dni.
  Promoted z [ID-005](IDEAS.md).

### TT-012 — Preskočiť prestávku neukladá 0 min + lišta kariet

- Stav: done (2026-09-02)
- `break_skipped: true` v dnešnom zázname; plánovaný odchod bez prestávky.
- Karty pod živým časom, `min-height: 52px`. Prestávka v nastaveniach 0–120.

### TT-001 — Settings screen pre pracovné konštanty

- Stav: done (2026-09-02)
- Karty Deň / Nastavenia / Dáta. `work_settings` + sanitize 1–23 / 1–120 / HH:MM.
- `work_records` sa z nastavení nezapisuje.

### TT-006 — Vyňať storage z `ui.js`

- Stav: done (2026-09-02)
- `scripts/storage.js` vlastní `work_records`, theme, `last_table_date`.

### TT-008 — `JSON.parse(localStorage)` vie zhodiť UI

- Stav: done (2026-09-02)
- `parseRecordsJson` vracia `{}` pri garbage; bootstrap nespadne.
