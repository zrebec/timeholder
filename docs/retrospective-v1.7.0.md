# Retrospektíva — v1.7.0

Pohľad na cestu od [v1.5.3](retrospective-v1.5.3.md) po TimeHolder 1.7.0
(2026-09-07). Číslo **56 testov** vo v1.5.3 ostáva historický fakt tej
verzie; dnes ich je **186**. Túto retrospektívu neprepisuj — ďalšia vlna
pôjde do nového súboru.

## TL;DR

**v1.5.3 spravila appku udržateľnou. v1.6.0–1.7.0 ju spravili použiteľnou
na celý pracovný týždeň, nie len na jeden deň.**

Z v1.5.3 ostalo: čisté ES moduly, testy importujú produkčný kód, Vite,
PWA, CI. Pribudlo: nastavenia, karty, týždeň Po–Ne, HO, fond 5 × denný
fond, skip = 30 min z nastavení (keď nie je zapnutá reálna prestávka).

## Čo v1.5.3 sľúbila a čo z toho je

Kandidáti pre v1.6.x z [retrospective-v1.5.3.md](retrospective-v1.5.3.md):

| Bod z v1.5.3                                                  | Stav v 1.7.0                              |
| ------------------------------------------------------------- | ----------------------------------------- |
| Settings screen (fond / prestávka / 15:00 / reálna prestávka) | ✅ v1.6.0, karta Nastavenia               |
| Notifikácia „môžeš ísť domov“                                 | ❌ ostáva [TT-002](../handover/ISSUES.md) |
| SW update toast                                               | ❌ ostáva [TT-003](../handover/ISSUES.md) |
| Maskable ikony + PWA shortcuts                                | ❌ ostáva [TT-005](../handover/ISSUES.md) |
| `validateBreakStart` dead code / heuristika 16 h              | ❌ ostáva [TT-004](../handover/ISSUES.md) |
| Tests one source of truth                                     | ✅ drží; 56 → 186                         |
| Modulárny `scripts/`                                          | ✅ plus `settings.js`, `storage.js`       |

Navyše, čo v1.5.3 ešte neplánovala a 1.7.0 má:

- týždenný kalendár na karte Deň (príchod / odchod, dole prestávka · v práci)
- fond týždňa = 5 × denný fond (8 h → 40 h; 7 h → 35 h; 9 h → 45 h)
- HO ako statická pečiatka 08:00 / 12:00–12:30 / 16:30 (vždy 8 h)
- Preskočiť pri vypnutom checkboxe stále berie prestávku z nastavení
- export JSON (import ešte nie)

## Čo 1.6.0 a 1.7.0 priniesli

### 1.6.0 — karty a nastavenia

- tri karty: Deň / Nastavenia / Dáta
- `work_settings` oddelené od `work_records`
- Preskočiť ako `break_skipped` (vtedy ešte 0 min v pláne)
- odolný `JSON.parse` — garbage v localStorage UI nezhodí

### 1.7.0 — týždeň, HO, skip 30 min

- kalendár Po–Ne pod ovládačmi dňa; šípky na iné týždne
- do súčtu idú uzavreté kúsky (odchod, alebo aspoň začiatok prestávky);
  len príchod sa ukáže, ale neráta sa
- zabudnutý pracovný deň = 0 odpracovaných a −1 × denný fond
- skip + vypnutá reálna prestávka = (odchod − príchod) − 30 min;
  plánovaný odchod ostáva príchod + fond + prestávka
- HO tlačidlo, kým ešte nie je príchod
- 186 testov vrátane playtest scenárov (`?seed=1` … `4`, `week`, `all`)
- archív `archive/timetrack_v1.7.0.zip`

## Porovnanie v1.5.3 → v1.7.0

|            | v1.5.3                                        | v1.7.0                                      |
| ---------- | --------------------------------------------- | ------------------------------------------- |
| Účel       | jeden deň, udržateľný kód                     | jeden deň + týždeň                          |
| Moduly     | 4 (`time-math`, `validation`, `ui`, `main`)   | + `settings`, `storage`                     |
| Testy      | 56 (historicky; neskôr v tom istom strome 80) | 186                                         |
| Nastavenia | len konštanty v kóde                          | karta, `work_settings`                      |
| História   | `work_records` v storage, UI len dnes         | kalendár Po–Ne                              |
| Skip       | 0 min                                         | 30 min z nastavení (checkbox off)           |
| PWA        | SW + manifest, bez update toastu              | to isté — toast stále chýba                 |
| Git        | CI yml bez lokálneho `.git`                   | lokálny repo, identita len v tomto adresári |
| Node       | README 20+, CI 20 v retrospektíve             | README 20+, CI 24 (nezjednotené)            |

## Známe trade-offs (stále platia z v1.5.3)

- iOS Vibration API neexistuje; ostáva `:active`
- `toAbsMin` chráni nočné zmeny, denný omyl prestávky pred príchodom
  sa nechytí ([TT-004](../handover/ISSUES.md))
- vlastný SW bez toastu pri novej verzii — po 1.7.0 treba PWA úplne zatvoriť
- denný fond sú **celé hodiny** 1–23; 7,5 h a 4-dňový týždeň nie
  ([ID-010](../handover/IDEAS.md))
- HO je vždy 8 h, aj keď denný fond nie je 8

## Ďalej (poradie)

Živý backlog je [handover/ISSUES.md](../handover/ISSUES.md) a
[handover/IDEAS.md](../handover/IDEAS.md). Stručne:

1. **Git na GitHub `zrebec/timeholder`** — push robí človek, súkromný účet,
   nie firemné global `user.*`
2. **Import JSON** — stará PWA na iPhone ([ID-009](../handover/IDEAS.md))
3. **SW update toast** — inak každá verzia ostane v starej cache ([TT-003](../handover/ISSUES.md))
4. **Notifikácia odchodu** ([TT-002](../handover/ISSUES.md))
5. Heuristika 16 h, maskable ikony, Node zjednotenie, 4-dňový týždeň neskôr

## Poznámka k procesu

v1.5.3 dokázala, že testy musia importovať produkčný kód. v1.7.0 to isté
použila na týždeň: najprv scenáre v teste, potom seed, potom layout.
Retrospektívy v `docs/` sa nemeňia; nová vlna = nový súbor.
