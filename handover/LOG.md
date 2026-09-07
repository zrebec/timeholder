# Session log

Najnovšie hore. Krátko: dátum, kto, čo, odkazy na TT/ID.

## 2026-09-07 — archive mimo git, Pages z dist/
- Kto: agent (Grok)
- Čo: `archive/` v `.gitignore` + `git rm --cached`. Vite `outDir: dist`.
  Pages cez Actions (nie folder na vetve — GH to na `/dist` nemá).
  Vetva `chore/ignore-archive-gh-pages`. Push nerobí agent.
  Staré `main` na GitHubе je iná história — ty nahradíš main.

## 2026-09-07 — docs 1.7.0 + lokálny git
- Kto: agent (Grok) na žiadosť používateľa
- Čo: [retrospective-v1.7.0.md](../docs/retrospective-v1.7.0.md) vs 1.5.3.
  README + AGENTS: dnešok a plán. `git init` len tu, `--local`
  zrebec / zrebec@zrebec.sk, `user.useConfigOnly`, remote origin
  (push nerobí agent). TT-009, TT-011 done.

## 2026-09-07 — release 1.7.0 + archív
- Kto: agent (Grok) na žiadosť používateľa
- Čo: bump `1.6.0` → `1.7.0`. Týždeň, HO, fond 5× denný, skip = 30 min
  pri vypnutom checkboxe. `CACHE_NAME` TimeHolder-v1.7.0. Archív
  `npm run archive` → `timetrack_v1.7.0.zip`. Skip ostáva ako v 1.7.0
  (odchod zapísaný + skip → prestávka z nastavení).

## 2026-09-07 — kalendár layout 1 (príchod/odchod + podriadok)
- Kto: agent (Grok)
- Čo: týždeň ako test1: Deň / Príchod / Odchod, dole prestávka · v práci.
  test3.html: label Odchod vpravo, Prestávka na stred.

## 2026-09-07 — Potemkin layouty týždňa (test1–3.html)
- Kto: agent (Grok)
- Čo: tri mobilné náhľady pod ovládačmi dňa. Žiadna zmena produkčného
  kalendára. Odporúčanie: layout 3.

## 2026-09-07 — 4 playtest scenáre + seed=1…4
- Kto: agent (Grok)
- Čo: testy 10–13 (5 dní +2h; 2×HO −2h; pol dňa; len príchody).
  Fond 5× denný (7/8/9). `?seed=1|2|3|4|all|week`. 4-dňový týždeň
  a 7,5 h = [ID-010](IDEAS.md).

## 2026-09-07 — 40h fond + HO + skip 30 min (playtest)
- Kto: agent (Grok)
- Čo: skip pri vypnutom checkboxe = 30 min (aj plánovaný odchod).
  Týždenný fond Po–Pi (5×8h). HO pečiatka 08:00/12:00–12:30/16:30.
  Seed `?seed=week` = 24.–28. 8. 2026 (3 práca + 2 HO). Testy až po
  playteste (používateľ).

## 2026-09-07 — 40h fond, scenár v teste, návrh 3+2 HO týždňa
- Kto: agent (Grok)
- Čo: používateľ upresnil fond 40h Po–Pi (zabudnutý deň = −8h).
  Scenár Po–Pi je v teste kat. 9 (zatiaľ RED: skip=0 a fond len
  kompletné dni). UI/súčet sa nementil — čaká sa na návrh 3 práca + 2 HO.

## 2026-09-07 — seed minulého týždňa + návrh súčtu po uzatvorených kúskoch
- Kto: agent (Grok)
- Čo: DEV `?seed=week` vyplní Ut–Pi minulého týždňa (Po/So/Ne prázdne, HO
  nie). Súčet „uzatvorený kúsok“ ešte nie — čakajú sa otázky.

## 2026-09-07 — týždeň: príchod vidno aj bez odchodu
- Kto: agent (Grok)
- Čo: nekompletný deň (len príchod) sa v kalendári schovával. Teraz ostane
  príchod v riadku, odchod/v práci ako `—`; do súčtu aj prebytku/deficitu
  idú len kompletné dni. TT-013 doplnené.

## 2026-09-07 — týždenný kalendár Po–Ne

- Kto: agent (Grok), schválený návrh
- Čo: [TT-013](ISSUES.md) / [ID-005](IDEAS.md). Tabuľka udalostí → malý
  týždeň (príchod / odchod / odpracované). Len kompletné dni; šípky;
  súčet týždňa. Čistá logika v `time-math.js`. Import JSON odložený ako
  [ID-009](IDEAS.md) (stará PWA na iPhone ešte existuje).
- Testy: 166 passed. Build OK.

## 2026-09-02 — release 1.6.0 + archív

- Kto: agent (Grok) na žiadosť používateľa
- Čo: bump `1.5.3RC4` → `1.6.0` (feat: karty, settings, skip). `CACHE_NAME`
  TimeHolder-v1.6.0. Archív cez `npm run archive` ako `timetrack_v1.6.0.zip`
  (skript premenovaný z dátumu na verziu z package.json).

## 2026-09-02 — fix skip prestávky + lišta hore

- Kto: agent (Grok), schválený plán
- Čo: Preskočiť ukladá `break_skipped` (0 min v pláne odchodu). Lišta kariet
  pod hodinami, väčšie terče. Prestávka 0 povolená v nastaveniach.
- TT-012 done. Testy + build overiť.

## 2026-09-02 — karty Deň / Nastavenia / Dáta

- Kto: agent (Grok), schválený plán
- Čo: `settings.js` + `storage.js`, 3 karty, sanitize fond/prestávka/odchod,
  export JSON. `work_records` sa z nastavení/exportu nezapisuje.
- Testy: 131 passed. Build OK.
- Uzavreté: TT-001, TT-006, TT-008
- Git: workspace stále bez `.git` — commit až po `git init` (ty). Žiadny push.
- Ďalej: na mobile overiť, že história ostala; PWA môže držať starý cache (TT-003).

## 2026-09-02 — git: žiadny zápis na main, žiadny push

- Kto: agent (Grok) na žiadosť používateľa
- Čo: do `handover/RULES.md` pridaná sekcia Git (vetva z `main`, lokálny
  commit, nikdy push / PR / pull do `main`). Zrkadlené ako tvrdý zákaz
  v `AGENTS.md`, `CLAUDE.md` a krátka veta v README.
- Ďalej: platnosť hneď, len čo existuje `.git`.

## 2026-09-02 — bootstrap agent kontraktu

- Kto: agent (Grok) na žiadosť používateľa
- Čo: pridané `AGENTS.md`, `CLAUDE.md`, `handover/` (README, RULES, ISSUES,
  IDEAS, LOG). README doplnený o odkaz na agent workflow.
- Zistenia: workspace nemá `.git`; README test count 80 sedí; retrospektíva
  v1.5.3 ešte píše 56; CI Node 24 vs. README 20+.
- Issues založené: TT-001 … TT-011
- Ďalej: počkať na prioritu (navrhované: TT-006/008 → TT-001 → TT-003)
