# Handover

Živý pracovný priestor medzi človekom a agentom. Sem patria otvorené problémy,
nápady a session poznámky. Retrospektívy v `docs/` sú história releaseov —
neprepisujú sa.

## Súbory

| Súbor | Účel |
| ----- | ---- |
| [RULES.md](RULES.md) | Čo agent smie a nesmie, matica adresárov (CI-CI pravidlá) |
| [ISSUES.md](ISSUES.md) | Otvorené a uzavreté problémy (tvoje aj agentove) |
| [IDEAS.md](IDEAS.md) | Nápady, ktoré ešte nie sú issue |
| [LOG.md](LOG.md) | Krátky chronologický denník session |

## ID schéma

- Issue: `TT-NNN` (TimeHolder ticket), číslovanie v `ISSUES.md`
- Nápada: `ID-NNN`, číslovanie v `IDEAS.md`
- Keď sa nápada schváli na prácu, preklop ju na `TT-NNN` a v IDEAS ju označ
  ako `promoted → TT-NNN`

Ďalšie voľné číslo si pozri na konci príslušného súboru, nehádaj.

## Stav issue

`open` · `in_progress` · `blocked` · `done` · `wontfix`

Záznam `done` sa nemaže. Presunie sa do sekcie Uzavreté.

## Šablóna issue

```md
### TT-NNN — krátky názov
- Stav: open
- Zdroj: user | agent | docs
- Oblasť: scripts/ui.js
- Dátum: YYYY-MM-DD
- Popis: jeden odsek čo je zle / čo chýba
- Akceptácia: ako spoznáme, že je to hotové
```

## Šablóna nápady

```md
### ID-NNN — krátky názov
- Zdroj: user | agent | docs
- Hodnota: vysoká | stredná | nízka
- Poznámka: prečo a čo by to odomklo
```

## Pravidlá zápisu

- Agent zapisuje nájdené bugy a nápady aj keď ich v danej session nerieši.
- Používateľove požiadavky, ktoré ostávajú otvorené, agent preklopí na issue.
- Žiadne eseje. Fakt, oblasť, ďalší krok.
- Nemeň históriu uzavretých záznamov okrem opravy faktu.
