# Nápady

Ďalšie voľné ID: **ID-011**.

Keď nápada ide do práce, preklop ju na `TT-NNN` v [ISSUES.md](ISSUES.md)
a sem daj `promoted → TT-NNN`.

## Fronta

### ID-001 — Settings screen (8h / 30min / 15:00 ako predvoľby)

- Zdroj: docs
- Hodnota: vysoká
- Poznámka: Najväčší UX skok. Odomkne appku iným fondom (7.5/30, 6/20, 4/0).
  Promoted ako [TT-001](ISSUES.md). **Hotové** (karty + sanitize).

### ID-002 — Notifikácia odchodu a prestávky

- Zdroj: docs
- Hodnota: vysoká
- Poznámka: „Môžeš ísť domov“ je vlajková PWA vec. Bonus z v1.5.2:
  „čas na prestávku“ po 4h. Promoted ako [TT-002](ISSUES.md).

### ID-003 — Toast pri novej verzii SW

- Zdroj: docs
- Hodnota: vysoká
- Poznámka: Pri častejších releasoch v1.6+ je to nutné, inak PWA ostane
  na starej cache. Promoted ako [TT-003](ISSUES.md).

### ID-004 — Heuristika 16h pre omyl vs. nočná zmena

- Zdroj: docs
- Hodnota: stredná
- Poznámka: Opravuje dead code vo `validateBreakStart` bez straty nočných
  zmien. Promoted ako [TT-004](ISSUES.md).

### ID-005 — História dní / týždenný prehľad

- Zdroj: agent
- Hodnota: vysoká
- Poznámka: Promoted → [TT-013](ISSUES.md). **Hotové** — malý Po–Ne
  kalendár na karte Deň (kompletné dni, odpracované, šípky týždňov).
  Import JSON a mesačný prehľad ostávajú mimo.

### ID-009 — Import JSON na karte Dáta

- Zdroj: user
- Hodnota: vysoká
- Poznámka: Po reinstall PWA na iPhone (nový názov = nový storage) sa
  stará história dá vytiahnuť z Mac Web Inspectora / exportu starej
  appky, ale dnes ju nie je kam vložiť. Merge do `work_records`, nič
  nemazať. CSV neskôr.

### ID-006 — `storage.js` + odolný parse

- Zdroj: docs / agent
- Hodnota: vysoká
- Poznámka: Predpoklad pre settings aj históriu. Promoted ako
  [TT-006](ISSUES.md) + [TT-008](ISSUES.md). **Hotové.**

### ID-007 — Git + zjednotenie Node + format:check v CI

- Zdroj: agent
- Hodnota: stredná
- Poznámka: Projekt sa má správať ako veľký: história, PR, reprodukovateľný
  engine. Súvisiace: [TT-009](ISSUES.md), [TT-010](ISSUES.md).
  `format:check` do CI až keď Prettier prejde na čistom strome.

### ID-010 — Pracovné dni v týždni + polovičný fond (7,5 h)
- Zdroj: user
- Hodnota: stredná
- Poznámka: Dnes fond = 5 × celé hodiny (Po–Pi). 4-dňový týždeň a 7,5 h
  denný fond zatiaľ nie. Až neskôr, nie v tejto fáze.

### ID-008 — JSDoc + `// @ts-check` + `jsconfig.json``

- Zdroj: docs
- Hodnota: stredná
- Poznámka: Retrospektíva v1.5.2 odporúča toto namiesto TypeScriptu, kým
  appka nepresiahne ~1500 riadkov alebo druhú obrazovku. Po settings +
  histórii to začne dávať zmysel. TypeScript stále nie default.

## Ľadnička

- PWA shortcuts + maskable ikony — [TT-005](ISSUES.md)
- Playwright smoke — [TT-007](ISSUES.md)
- `vite-plugin-pwa` namiesto ručného SW — len ak TT-003 bude bolieť
- i18n (UI je slovenské; neriešiť, kým nebude druhý jazyk)
- IndexedDB namiesto localStorage — predčasné, kým história ostáva malá
- Break reminder po 4h — súčasť ID-002, nie samostatný release
