# Retrospektíva — stav po v1.5.2

Prvý strategický pohľad na aplikáciu po release v1.5.2. Cieľom nie je vyriešiť všetko naraz,
ale mať pomenované, kam by sme sa mohli posúvať a v akom poradí.

## Čo je dobré tak ako je

- **Žiadny build step** — nasadenie = upload, dev = F5. Pre solo projekt obrovská výhoda,
  neopúšťať to ľahkovážne.
- **PWA základy** — manifest, service worker, offline. Funguje.
- **Stav v `localStorage`** je primeraný rozsahu aplikácie.
- **Skript po refaktore v1.5.2** je čitateľný (~470 riadkov), polnočný problém vyriešený
  cez absolútne minúty (`toAbsMin`).

## Medzery — zoradené podľa pomeru hodnota/úsilie

### 1. Nastavenia v UI namiesto konštánt

`WORK_HOURS`, `BREAK_MINUTES`, `EARLIEST_DEPARTURE_MINUTES`, `USE_ACTUAL_BREAK_TIME` sú
dnes zadrôtované v kóde. Pridaním settings screenu (napr. cez ikonku ozubeného kolieska)
sa aplikácia stáva použiteľná pre ľubovoľný pracovný fond — 8/30, 7.5/30, 4/0…
**Najväčší UX skok za pár hodín práce.**

### 2. Notifikácie (PWA Notification API)

- „Môžeš ísť domov" o vypočítanom čase odchodu
- „Čas na prestávku" po 4h od príchodu
- Vyžaduje: permission prompt + push registration logika v `sw.js` + plánovanie cez
  `setTimeout` alebo `showTrigger` (experimentálne).
- **Toto je to, čo z PWA robí PWA**, nielen webovú stránku v ikonke.

### 3. Service Worker update flow

Dnes: keď zmeníš `CACHE_NAME` na v1.5.3, používateľ nedostane upozornenie, dokým appku
úplne nezavrie. Štandardný pattern: zachytiť `controllerchange` event a ukázať toast
„Nová verzia – obnov".

### 4. Accessibility

- Ikonové tlačidlá (▲ ▼ ⏰ ↩️ ⏭️) nemajú `aria-label`. Screen reader to číta nezmyselne.
- Klávesnica nefunguje — focus na digit columns nič nerobí.
- Pre mobile-first PWA zriedka kritické, ale **lacné to fixnúť**.

### 5. `tests.js` je dnes mŕtvy kód

Node ho síce načíta, ale `script.js` nič neexportuje, takže testy reálne funkcie volať
nemôžu. Buď opraviť (ES modules + `node --experimental-vm-modules`), alebo zmazať.

**Update v1.5.3:** Tests.js bol synchronizovaný s aktuálnym script.js (62 testov prešlo),
ale stále drží **kópie** funkcií. Reálna oprava (jeden zdroj pravdy) vyžaduje
modularizáciu — viď bod 7.

### 5b. Drobná regresia v1.5.2 — `validateBreakStart` „pred príchodom" check

Pôvodne: ak používateľ nastavil čas prestávky pred príchodom (omyl), validátor zahlásil
chybu.

Po refaktore na absolútne minúty (`toAbsMin`) sa táto kontrola stala dead code — funkcia
posunie „skorší" čas o 24h dopredu, takže `currentAbsMin < arrivalMin` je vždy false.

**Trade-off:** podporuje nočné zmeny (príchod 22:00, prestávka o 01:00) za cenu, že
nedetekuje denné omyly. Pre v1.5.3 ponechané ako je. Možné riešenie do budúcna:
heuristika „ak je crossing > 16h, je to omyl, nie nočná zmena".

### 6. Haptic feedback

`navigator.vibrate(20)` pri uložení udalosti. **Jeden riadok**, na mobile robí appku
znateľne „premiumovejšou".

### 7. Modulárizácia `script.js`

Kandidáti na samostatné moduly (čisté ES modules, žiadny bundler):

- `time-math.js` — `parseTimeToMinutes`, `toAbsMin`, `getPlannedDepartureAbsMin`
  (čisté funkcie, testovateľné)
- `storage.js` — load/save records
- `ui.js` — DOM manipulácie
- `main.js` — orchestrácia + init

Stačí `<script type="module" src="main.js">`. Bonus: `tests.js` ich konečne bude môcť
importovať.

### 8. Polish detaily

- Maskable icons pre Android (aktuálne nie sú označené `purpose: "maskable"`)
- PWA shortcuts v manifeste (napr. „Rýchly príchod")
- Lepšia SW caching stratégia (stale-while-revalidate namiesto cache-first)

## Štýl kódu — TypeScript?

Pre ~500 riadkov **TypeScript je overkill** a stratíme no-build výhodu.

**Odporúčaný kompromis: JSDoc + `// @ts-check`** + `jsconfig.json`:

```js
// @ts-check
/** @typedef {{arrival?: string, break_start?: string, break_end?: string, departure?: string}} WorkRecord */
```

VSCode dá autocomplete, červené podčiarknutia pri zlých typoch, refaktoring — všetko
čo TS, bez build kroku.

**Na TypeScript prejsť až keď** aplikácia presiahne ~1500 riadkov alebo pribudne
druhá obrazovka/komponent.

## Odporúčané poradie krokov

Ak by sme mali vybrať poradie podľa hodnoty:

1. **Settings screen** — otvára appku iným ľuďom
2. **Notifikácie** — vlajková PWA feature
3. **SW update flow** — pre samotného autora pri každom release
4. **Accessibility + haptic** — polish
5. **Modulárizácia + testy** — keď príde čas niečo väčšie meniť

## Plán pre v1.5.3

Dohodnutý balík (poradie podľa rozhodnutia):

1. **Haptic feedback** (bod 6) — najlacnejšie, prvé
2. **Accessibility** (bod 4) — aria-labels + klávesnicové ovládanie
3. **Doladenie testov** (bod 5) — aby `tests.js` reálne testoval kód

Settings screen, notifikácie a SW update flow ostávajú ako kandidáti pre v1.6.0+.
