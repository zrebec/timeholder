# Pravidlá pre agentov (CI-CI)

Toto je matica oprávnení. Kanonický kontext projektu je [../AGENTS.md](../AGENTS.md).
Keď si pravidlá odporujú, platí prísnejšie z nich a vzniká issue.

**CI** tu znamená dve veci naraz:

1. **Agent contract** — čo smieš editovať, kam nesmieš siahnuť.
2. **Continuous integration** — `.github/workflows/ci.yml` ostáva zelené.

## Matica adresárov

| Cesta | Agent | Poznámka |
| ----- | ----- | -------- |
| `scripts/*.js` okrem `archive-project.mjs` | **áno** | jadro aplikácie |
| `scripts/archive-project.mjs` | opatrne | len keď sa mení archivačný proces |
| `tests/` | **áno** | povinné pri zmene čistých funkcií |
| `index.html`, `styles.css` | **áno** | UI, zachovať a11y a žiadne inline `onclick` |
| `public/sw.js`, `public/manifest.json`, `public/site.webmanifest` | **áno** | pri release bump `CACHE_NAME` |
| `public/icons/`, favicony | nie, kým ťa o to nepýtajú | binárne assety |
| `docs/` | append-only | nový súbor áno; staré retrospektívy neprepisovať |
| `handover/` | **áno, povinné** | issues, nápady, log |
| `AGENTS.md`, `CLAUDE.md` | opatrne | zmena zmluvy = vedomé rozhodnutie |
| `README.md` | áno pri faktickej zmene | verzia, test count, strom, príkazy |
| `package.json` | opatrne | lockfile ide vždy spolu; žiadny nový dep bez súhlasu |
| `package-lock.json` | len cez `npm install` / `npm ci` | neditovať ručne |
| `vite.config.js` | opatrne | `base: './'`, žiadne hashed filenames |
| `.github/workflows/` | opatrne | nemeň Node verziu ako „cleanup“ |
| `.gitignore` | opatrne | `dist/`, `archive/` a `node_modules/` musia ostať ignorované |
| `archive/` | **nie** | len `npm run archive` na žiadosť; **nie v gite** |
| `dist/` | **nie** | generuje `npm run build` |
| `build/` | **nie** | starý názov výstupu |
| `node_modules/` | **nie** | nikdy |

## Povinné pri zmene kódu

1. Dotknutá čistá funkcia → test v párovom `tests/*.tests.js`.
2. `npm test` pred odovzdaním. Regression nie je „neskôr“.
3. Zmena UI, SW, manifestu alebo Vite → `npm run build` musí prejsť.
4. Nový bug / nápada mimo scope → zápis do handover, nie tichý refactor.
5. Zmena `package.json` dependencies → commitnúť aj `package-lock.json`
   (keď už bude git).

## CI pipeline

Aktuálny workflow (`.github/workflows/ci.yml`):

- trigger: push/PR na `main`
- Node **24**, cache npm
- `npm ci` → `npm test` → `npm run build`
- upload `dist/` artifact, retention 7 dní
- Pages workflow: build `dist/` a deploy na GitHub Pages (nie commit `dist/`)

Čo CI dnes **nerobí** (nemeň to mlčky):

- `npm run format:check`
- E2E / Playwright
- deploy

Keď bude git, zelený CI job je podmienka merge. Kým `.git` neexistuje,
lokálne `npm test` + `npm run build` sú náhrada.

## Git: nikdy `main`, commit áno, push nikdy

`main` je chránená vetva. Agent na ňu **nezapisuje**, **necommituje**,
**nemerguje**, **nerebasuje** a **nepushuje**. Pull request do `main`
a `git pull` naspäť na `main` robí **len používateľ**.

### Postup pred prvým commítom v session

1. `git init` len na výslovnú žiadosť. Len čo `.git` existuje, toto pravidlo
   platí okamžite.
2. Identita commitu **len `--local`**: `user.name=zrebec`,
   `user.email=zrebec@zrebec.sk`. Nikdy `git config --global` tu —
   global je firemné konto a nesmie sa pomiešať so súkromným
   `https://github.com/zrebec/timeholder`.
3. Zisti aktuálnu vetvu (`git branch --show-current` / `git status`).
4. Ak si na `main` alebo `master`:
   - vytvor **novú** vetvu **z `main`** (`git switch -c …` / `git checkout -b …`)
   - necommituj najprv na `main` a až potom vetviť
5. Ak už si na feature vetve tejto úlohy, zostaň na nej. Neskákaj späť na `main`.
6. Názov vetvy: `tt-NNN-kratky-slug` (issue) alebo `id-NNN-kratky-slug` (nápada).
   Bez issue: `feat/kratky-slug` / `fix/kratky-slug`.

### Čo na feature vetve smieš

- `git add` (len súbory z tejto úlohy)
- `git commit` (lokálne, na tej vetve)

### Čo nesmieš nikdy — ani na požiadanie v duchu „len rýchlo“

- commit, amend, merge, rebase, cherry-pick **na `main` / `master`**
- `git push` v akejkoľvek podobe (`origin`, `-u`, `--force`, `--tags`)
- otvoriť Pull Request (`gh pr create`, GitHub API, ručný remote)
- `git pull` / `git merge` **do `main`**
- force-push, rewrite histórie na zdieľaných vetvách
- nastaviť upstream, aby ďalší commit išiel von sám

Po commite povedz používateľovi názov vetvy a že push + PR + merge + pull
do `main` sú na ňom. Neponúkaj, že to pushneš ty.

## Smieš

- Pridať ES modul do `scripts/` a párový test, ak to úloha vyžaduje.
- Rozšíriť vlastný test framework v `tests/_framework.js` o malý assert.
- Upraviť slovenské copy, a11y atribúty, CSS, haptic vzory.
- Zapisovať do `handover/` bez pýtania sa — to je účel adresára.
- Navrhnúť väčší krok (settings, notifikácie, TS) v IDEAS, nie ho implementovať
  ako bočný efekt.
- Lokálny commit na **feature vetve odbočenej z `main`**. Nie push.

## Nesmieš

- Pridať React, Vue, Svelte, TypeScript, Jest, Vitest, Tailwind, `vite-plugin-pwa`
  bez výslovnej žiadosti.
- Zaviesť backend, databázu, auth, sync, analytics, telemetriu.
- Zmeniť defaulty `WORK_HOURS` / `BREAK_MINUTES` / `EARLIEST_DEPARTURE_MINUTES`
  / `USE_ACTUAL_BREAK_TIME`.
- Rozbiť podporu nočných zmien (`toAbsMin` + 1440).
- Registrovať SW v dev (localhost / 127.* / `192.168.*` / `10.*` / `172.16-31.*`).
- Zapnúť hashed Vite filenames.
- Kopírovať produkčné funkcie do testov.
- Vrátiť inline `onclick` do `index.html`.
- Nahradiť digit `role="spinbutton"` natívnym `input type="number"`.
- Spustiť `git init` bez výslovnej žiadosti.
- Čokoľvek zapisovať do `main` / `master` (commit, merge, rebase, pull).
- `git push`, force-push, otvárať PR, mergovať PR, `git pull` do `main`.
- Commmitnúť tajomstvá, `.env` s kľúčmi, alebo `node_modules/`.
- Generovať nové PNG ikony, kým o to nepožiadajú.
- Preformátovať celý repo ako jedinú zmenu.

## Veľkosť zmeny

Jedna úloha = jeden súvislý diff. Settings screen nie je príležitosť
prepnúť na TypeScript. Ak vidíš súvisiaci dlh, zapíš `TT-` / `ID-` a pokračuj
v zadaní.

## Konflikty a neistota

- Nejasný UX (napr. heuristika 16h vs. nočná zmena) → issue + otázka, nie tichý guess.
- Konflikt README vs. kód vs. CI → verí kódu, zapíš issue na dokumentáciu.
- Potrebuješ novú dependency → zastav sa a spýtaj sa.
