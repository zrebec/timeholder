# CLAUDE.md

Pokyny pre Claude Code. Kanonická zmluva projektu je [AGENTS.md](AGENTS.md).
Tento súbor ju neduplikuje — doplňuje len Claude-špecifický postup.

## Povinné čítanie

Pred úpravou kódu prečítaj v tomto poradí:

1. [AGENTS.md](AGENTS.md)
2. [handover/RULES.md](handover/RULES.md)
3. Otvorené položky v [handover/ISSUES.md](handover/ISSUES.md)

## Ako tu pracovať

- TimeHolder je malá PWA bez backendu. Drž ju malú. Nový npm balík alebo
  framework len po výslovnom súhlase.
- Čistá logika žije v `scripts/time-math.js` a `scripts/validation.js`.
  `storage.js` vlastní `work_records`; `settings.js` vlastní `work_settings`.
  `ui.js` ich volá a neráta `JSON.parse` priamo.
- Testy musia importovať produkčný kód. Po zmene čistých funkcií spusti
  `npm test`. Po zmene UI/PWA ešte `npm run build`.
- Slovenské UI reťazce nemeň na angličtinu.
- Rozhodnutia, bugy a nápady zapisuj do `handover/`, nie do retrospektív v `docs/`.

## Session hygiena

Na začiatku väčšej práce dopíš do [handover/LOG.md](handover/LOG.md) krátky
záznam (dátum, cieľ). Na konci:

- uzavri alebo aktualizuj issue v `handover/ISSUES.md`
- ak vznikol nápada mimo scope, daj ho do `handover/IDEAS.md`
- nenechávaj TODO komentáre v kóde ako náhradu za handover záznam

## Git (pevné)

Nepíš na `main`. Pred commítom odboč vetvu z `main`, commituj **len na nej**.
Nespúšťaj `git push`, neotváraj PR, nemergeuj do `main`, nerob `git pull`
do `main`. To robí používateľ. Kanonický postup:
[handover/RULES.md](handover/RULES.md) (sekcia Git).
`user.name` / `user.email` len `--local` (zrebec / zrebec@zrebec.sk).
Nikdy `git config --global`.

## Čo Claude nemá robiť sám

- `git init` bez žiadosti; **akýkoľvek zápis na `main`**; `git push`; PR; merge
- zmena CI Node verzie, Vite filename hashing
- prepis `docs/retrospective-*.md`
- ručné súbory v `archive/` a `dist/` / `build/`
- TypeScript / React / Vitest / `vite-plugin-pwa` bez požiadavky
- zmena defaultov `WORK_HOURS`, `BREAK_MINUTES`, `EARLIEST_DEPARTURE_MINUTES`

Ak je úloha nejednoznačná (settings vs. notifikácie vs. refactor), spýtaj sa
alebo navrhnúť plán. Neskákaj do v1.6.x balíka naraz.
