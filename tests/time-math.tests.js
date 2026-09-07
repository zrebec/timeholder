// Testy pre scripts/time-math.js
import {
  WORK_HOURS,
  BREAK_MINUTES,
  EARLIEST_DEPARTURE_MINUTES,
  pad,
  isValidMinuteOfDay,
  parseTimeToMinutes,
  minutesToDisplay,
  toAbsMin,
  getBreakDuration,
  getPlannedDepartureAbsMin,
  calculateWorkedMinutes,
  addCalendarDays,
  mondayOfWeek,
  weekDates,
  isCompleteRecord,
  completedWorkedMinutes,
  buildWeekDays,
  sumWeekWorkedMinutes,
  sumWeekDiffMinutes,
  canGoToNextWeek,
  formatHoursMinutes,
  formatSignedHoursMinutes,
} from "../scripts/time-math.js";

import { category, test, assertEqual, assertNull } from "./_framework.js";

// ----------------------------------------------------------------------------
category("1. Utility funkcie");
// ----------------------------------------------------------------------------

test('pad(5) → "05"', () => assertEqual(pad(5), "05"));
test('pad(0) → "00"', () => assertEqual(pad(0), "00"));
test('pad(15) → "15"', () => assertEqual(pad(15), "15"));
test('pad(59) → "59"', () => assertEqual(pad(59), "59"));

test("isValidMinuteOfDay akceptuje 0 a 1439", () => {
  assertEqual(isValidMinuteOfDay(0), true);
  assertEqual(isValidMinuteOfDay(1439), true);
});

test("isValidMinuteOfDay odmieta -1, 1440, float a string", () => {
  assertEqual(isValidMinuteOfDay(-1), false);
  assertEqual(isValidMinuteOfDay(1440), false);
  assertEqual(isValidMinuteOfDay(12.5), false);
  assertEqual(isValidMinuteOfDay("12:00"), false);
});

test('parseTimeToMinutes("08:30") → 510', () =>
  assertEqual(parseTimeToMinutes("08:30"), 510));
test('parseTimeToMinutes("00:00") → 0', () =>
  assertEqual(parseTimeToMinutes("00:00"), 0));
test('parseTimeToMinutes("23:59") → 1439', () =>
  assertEqual(parseTimeToMinutes("23:59"), 1439));
test('parseTimeToMinutes("12:00") → 720', () =>
  assertEqual(parseTimeToMinutes("12:00"), 720));
test("parseTimeToMinutes(null) → null", () =>
  assertNull(parseTimeToMinutes(null)));
test('parseTimeToMinutes("abc") → null', () =>
  assertNull(parseTimeToMinutes("abc")));
test('parseTimeToMinutes("") → null', () => assertNull(parseTimeToMinutes("")));
test('parseTimeToMinutes("24:00") → null', () =>
  assertNull(parseTimeToMinutes("24:00")));
test('parseTimeToMinutes("12:60") → null', () =>
  assertNull(parseTimeToMinutes("12:60")));
test('parseTimeToMinutes("-1:00") → null', () =>
  assertNull(parseTimeToMinutes("-1:00")));
test('parseTimeToMinutes("8:30") → null (vyžaduje HH:MM)', () =>
  assertNull(parseTimeToMinutes("8:30")));
test('parseTimeToMinutes("08:30:00") → null', () =>
  assertNull(parseTimeToMinutes("08:30:00")));

test('minutesToDisplay(510) → "08:30"', () =>
  assertEqual(minutesToDisplay(510), "08:30"));
test('minutesToDisplay(0) → "00:00"', () =>
  assertEqual(minutesToDisplay(0), "00:00"));
test('minutesToDisplay(1439) → "23:59"', () =>
  assertEqual(minutesToDisplay(1439), "23:59"));
test('minutesToDisplay(1500) → "01:00" (wrap)', () =>
  assertEqual(minutesToDisplay(1500), "01:00"));
test('minutesToDisplay(1830) → "06:30" (next day)', () =>
  assertEqual(minutesToDisplay(1830), "06:30"));
test('minutesToDisplay(-1) → "23:59" (negative wrap)', () =>
  assertEqual(minutesToDisplay(-1), "23:59"));
test('minutesToDisplay(NaN) → "--:--"', () =>
  assertEqual(minutesToDisplay(NaN), "--:--"));

// ----------------------------------------------------------------------------
category("2. toAbsMin — polnočný helper");
// ----------------------------------------------------------------------------

test("toAbsMin(600, 480) → 600 (rovnaký deň)", () =>
  assertEqual(toAbsMin(600, 480), 600));
test("toAbsMin(120, 1320) → 1560 (02:00 po príchode 22:00)", () =>
  assertEqual(toAbsMin(120, 1320), 1560));
test("toAbsMin(480, 480) → 480 (rovnaký čas ako príchod)", () =>
  assertEqual(toAbsMin(480, 480), 480));
test("toAbsMin(0, 720) → 1440 (polnoc po obed-príchode)", () =>
  assertEqual(toAbsMin(0, 720), 1440));
test("toAbsMin(390, 1320) → 1830 (06:30 po príchode 22:00)", () =>
  assertEqual(toAbsMin(390, 1320), 1830));
test("toAbsMin odmieta neplatné raw/arrival minúty", () => {
  assertNull(toAbsMin(null, 480));
  assertNull(toAbsMin(480, null));
  assertNull(toAbsMin(1440, 480));
  assertNull(toAbsMin(480, -1));
});

// ----------------------------------------------------------------------------
category("3. Break duration");
// ----------------------------------------------------------------------------

test("bez prestávky → BREAK_MINUTES", () => {
  assertEqual(getBreakDuration({ arrival: "08:00" }), BREAK_MINUTES);
});

test("prestávka začala, neukončená → BREAK_MINUTES", () => {
  assertEqual(
    getBreakDuration({ arrival: "08:00", break_start: "12:00" }),
    BREAK_MINUTES,
  );
});

test("45min prestávka, USE_ACTUAL=false → BREAK_MINUTES (30)", () => {
  assertEqual(
    getBreakDuration({
      arrival: "08:00",
      break_start: "12:00",
      break_end: "12:45",
    }),
    BREAK_MINUTES,
  );
});

test("prázdny record → BREAK_MINUTES", () => {
  assertEqual(getBreakDuration({}), BREAK_MINUTES);
});

test("break_skipped + vypnutá reálna prestávka → BREAK_MINUTES", () => {
  assertEqual(
    getBreakDuration({ arrival: "06:04", break_skipped: true }),
    BREAK_MINUTES,
  );
});

test("break_skipped + USE_ACTUAL true → 0 min", () => {
  assertEqual(
    getBreakDuration(
      { arrival: "06:04", break_skipped: true },
      { breakMinutes: 30, useActualBreakTime: true },
    ),
    0,
  );
});

// ----------------------------------------------------------------------------
category("4. Plánovaný odchod (absolútne minúty)");
// ----------------------------------------------------------------------------

test("príchod 08:00 → odchod 16:30 (990)", () => {
  assertEqual(getPlannedDepartureAbsMin({ arrival: "08:00" }), 16 * 60 + 30);
  assertEqual(minutesToDisplay(990), "16:30");
});

test("príchod 06:30 → odchod presne 15:00 (900)", () => {
  assertEqual(
    getPlannedDepartureAbsMin({ arrival: "06:30" }),
    EARLIEST_DEPARTURE_MINUTES,
  );
});

test("príchod 05:30 → restricted na 15:00 (calc by bol 14:00)", () => {
  assertEqual(
    getPlannedDepartureAbsMin({ arrival: "05:30" }),
    EARLIEST_DEPARTURE_MINUTES,
  );
});

test("príchod 09:00 → odchod 17:30", () => {
  assertEqual(getPlannedDepartureAbsMin({ arrival: "09:00" }), 17 * 60 + 30);
});

test("preskočená prestávka → +30min v pláne", () => {
  assertEqual(
    minutesToDisplay(getPlannedDepartureAbsMin({ arrival: "08:00" })),
    "16:30",
  );
});

test("NOČNÁ ZMENA — príchod 22:00 → odchod 06:30 (1830 abs)", () => {
  assertEqual(getPlannedDepartureAbsMin({ arrival: "22:00" }), 1830);
  assertEqual(minutesToDisplay(1830), "06:30");
});

test("NOČNÁ ZMENA — príchod 23:00 → odchod 07:30 (1890 abs)", () => {
  assertEqual(
    getPlannedDepartureAbsMin({ arrival: "23:00" }),
    23 * 60 + 8 * 60 + 30,
  );
});

test("príchod presne o polnoci (00:00) → restricted na 15:00", () => {
  assertEqual(
    getPlannedDepartureAbsMin({ arrival: "00:00" }),
    EARLIEST_DEPARTURE_MINUTES,
  );
});

test("WORK_HOURS konštanta = 8", () => {
  assertEqual(WORK_HOURS, 8);
});

test("plánovaný odchod bez príchodu → null", () => {
  assertNull(getPlannedDepartureAbsMin({}));
});

test("plánovaný odchod s neplatným príchodom → null", () => {
  assertNull(getPlannedDepartureAbsMin({ arrival: "25:00" }));
});

// ----------------------------------------------------------------------------
category("5. Odpracované minúty");
// ----------------------------------------------------------------------------

test("08:00 → 12:00, bez prestávky → 240m (4h)", () => {
  assertEqual(calculateWorkedMinutes({ arrival: "08:00" }, 12 * 60), 240);
});

test("08:00 → 16:30, bez prestávky → 510m (8.5h)", () => {
  assertEqual(calculateWorkedMinutes({ arrival: "08:00" }, 16 * 60 + 30), 510);
});

test("prestávka ongoing → len čas pred prestávkou", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00" },
      12 * 60 + 30,
    ),
    240,
  );
});

test("30min prestávka ukončená → 8h (s fixným odpočítaním 30m)", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
      16 * 60 + 30,
    ),
    480,
  );
});

test("45min prestávka, USE_ACTUAL=false → 8h (vždy odpočíta 30m)", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00", break_end: "12:45" },
      16 * 60 + 30,
    ),
    480,
  );
});

test("čas pred začiatkom prestávky", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
      10 * 60,
    ),
    120,
  );
});

test("NOČNÁ ZMENA — príchod 22:00, teraz 02:00 → 240m (4h)", () => {
  assertEqual(calculateWorkedMinutes({ arrival: "22:00" }, 2 * 60), 240);
});

test("NOČNÁ ZMENA — príchod 23:00, teraz 07:00 → 480m (8h)", () => {
  assertEqual(calculateWorkedMinutes({ arrival: "23:00" }, 7 * 60), 480);
});

test("NOČNÁ ZMENA — príchod 22:00, prestávka 23:30-00:00, teraz 02:00 → 210m", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "22:00", break_start: "23:30", break_end: "00:00" },
      2 * 60,
    ),
    210,
  );
});

test("calculateWorkedMinutes bez príchodu → null", () => {
  assertNull(calculateWorkedMinutes({}, 12 * 60));
});

test("calculateWorkedMinutes s neplatným nowMin → null", () => {
  assertNull(calculateWorkedMinutes({ arrival: "08:00" }, 1440));
});

test("calculateWorkedMinutes s poškodeným break_start → null", () => {
  assertNull(
    calculateWorkedMinutes({ arrival: "08:00", break_start: "99:99" }, 12 * 60),
  );
});

test("calculateWorkedMinutes s poškodeným break_end → null", () => {
  assertNull(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00", break_end: "99:99" },
      13 * 60,
    ),
  );
});

// ----------------------------------------------------------------------------
category("5b. Plánovaný odchod so settings argumentom");
// ----------------------------------------------------------------------------

const sixHourNoFloor = {
  workHours: 6,
  breakMinutes: 30,
  earliestDepartureMinutes: 0,
  useActualBreakTime: false,
};

test("fond 6h, earliest 00:00, príchod 08:00 → 14:30", () => {
  assertEqual(
    getPlannedDepartureAbsMin({ arrival: "08:00" }, sixHourNoFloor),
    14 * 60 + 30,
  );
});

test("fond 6h, earliest ostáva 15:00, príchod 08:00 → 15:00 (podlaha)", () => {
  assertEqual(
    getPlannedDepartureAbsMin(
      { arrival: "08:00" },
      {
        workHours: 6,
        breakMinutes: 30,
        earliestDepartureMinutes: 15 * 60,
        useActualBreakTime: false,
      },
    ),
    15 * 60,
  );
});

test("bez settings argumentu ostáva default 8h/15:00", () => {
  assertEqual(getPlannedDepartureAbsMin({ arrival: "08:00" }), 16 * 60 + 30);
});

test("USE_ACTUAL true, 45min prestávka → break duration 45", () => {
  assertEqual(
    getBreakDuration(
      { arrival: "08:00", break_start: "12:00", break_end: "12:45" },
      { useActualBreakTime: true, breakMinutes: 30 },
    ),
    45,
  );
});

test("USE_ACTUAL true, 45min prestávka, fond 8h, príchod 08:00 → odchod 16:45", () => {
  assertEqual(
    getPlannedDepartureAbsMin(
      { arrival: "08:00", break_start: "12:00", break_end: "12:45" },
      {
        workHours: 8,
        breakMinutes: 30,
        earliestDepartureMinutes: 15 * 60,
        useActualBreakTime: true,
      },
    ),
    16 * 60 + 45,
  );
});

test("USE_ACTUAL true, odpracované po 45min prestávke", () => {
  assertEqual(
    calculateWorkedMinutes(
      { arrival: "08:00", break_start: "12:00", break_end: "12:45" },
      16 * 60 + 45,
      {
        workHours: 8,
        breakMinutes: 30,
        useActualBreakTime: true,
      },
    ),
    8 * 60,
  );
});

test("06:04 + 8h, skip, earliest 00:00 → 14:34 (stále 30 min prestávka)", () => {
  assertEqual(
    getPlannedDepartureAbsMin(
      { arrival: "06:04", break_skipped: true },
      {
        workHours: 8,
        breakMinutes: 30,
        earliestDepartureMinutes: 0,
        useActualBreakTime: false,
      },
    ),
    14 * 60 + 34,
  );
});

test("06:04 + 8h bez skipu, earliest 00:00 → 14:34 (odhad 30min)", () => {
  assertEqual(
    getPlannedDepartureAbsMin(
      { arrival: "06:04" },
      {
        workHours: 8,
        breakMinutes: 30,
        earliestDepartureMinutes: 0,
        useActualBreakTime: false,
      },
    ),
    14 * 60 + 34,
  );
});

// ----------------------------------------------------------------------------
category("6. Týždeň — kalendárne dátumy (Po–Ne)");
// ----------------------------------------------------------------------------

test('addCalendarDays("2026-09-07", 1) → "2026-09-08"', () =>
  assertEqual(addCalendarDays("2026-09-07", 1), "2026-09-08"));

test('addCalendarDays("2026-12-31", 1) → "2027-01-01"', () =>
  assertEqual(addCalendarDays("2026-12-31", 1), "2027-01-01"));

test('addCalendarDays("2024-02-28", 1) → "2024-02-29" (priestupný)', () =>
  assertEqual(addCalendarDays("2024-02-28", 1), "2024-02-29"));

test('addCalendarDays("2026-09-07", -1) → "2026-09-06"', () =>
  assertEqual(addCalendarDays("2026-09-07", -1), "2026-09-06"));

test("addCalendarDays odmieta neplatný dátum", () => {
  assertNull(addCalendarDays("2026-13-01", 1));
  assertNull(addCalendarDays("07.09.2026", 1));
  assertNull(addCalendarDays("", 1));
  assertNull(addCalendarDays(null, 1));
});

test('mondayOfWeek("2026-09-07") pondelok → sám seba', () =>
  assertEqual(mondayOfWeek("2026-09-07"), "2026-09-07"));

test('mondayOfWeek("2026-09-09") streda → "2026-09-07"', () =>
  assertEqual(mondayOfWeek("2026-09-09"), "2026-09-07"));

test('mondayOfWeek("2026-09-13") nedeľa → "2026-09-07"', () =>
  assertEqual(mondayOfWeek("2026-09-13"), "2026-09-07"));

test("mondayOfWeek cez zlom mesiaca (streda 1. október → Po 28.9.)", () =>
  assertEqual(mondayOfWeek("2026-10-01"), "2026-09-28"));

test("mondayOfWeek odmieta neplatný dátum", () => {
  assertNull(mondayOfWeek("2026-09-31"));
  assertNull(mondayOfWeek("n/a"));
});

test("weekDates pondelka vráti 7 dní Po–Ne", () => {
  const days = weekDates("2026-09-07");
  assertEqual(days.length, 7);
  assertEqual(days[0], "2026-09-07");
  assertEqual(days[6], "2026-09-13");
});

test("weekDates neplatného pondelka → null", () =>
  assertNull(weekDates("nie")));

// ----------------------------------------------------------------------------
category("7. Týždeň — kompletný deň a odpracované");
// ----------------------------------------------------------------------------

test("isCompleteRecord vyžaduje príchod aj odchod", () => {
  assertEqual(isCompleteRecord({ arrival: "08:00", departure: "16:30" }), true);
  assertEqual(isCompleteRecord({ arrival: "08:00" }), false);
  assertEqual(isCompleteRecord({ departure: "16:30" }), false);
  assertEqual(isCompleteRecord({}), false);
  assertEqual(isCompleteRecord(null), false);
});

test("isCompleteRecord odmietne neplatné HH:MM", () => {
  assertEqual(isCompleteRecord({ arrival: "8:00", departure: "16:30" }), false);
});

test("kompletný deň s prestávkou → 8h (480m), ako sumár", () => {
  assertEqual(
    completedWorkedMinutes({
      arrival: "08:00",
      break_start: "12:00",
      break_end: "12:30",
      departure: "16:30",
    }),
    480,
  );
});

test("kompletný deň so skipnutou prestávkou → 8h (stále −30 min)", () => {
  assertEqual(
    completedWorkedMinutes({
      arrival: "08:00",
      break_skipped: true,
      departure: "16:30",
    }),
    480,
  );
});

test("kompletný deň bez prestávky v zázname → odpočíta fixných 30m", () => {
  assertEqual(
    completedWorkedMinutes({ arrival: "08:00", departure: "16:30" }),
    480,
  );
});

test("nekompletný deň (bez odchodu) → null, nerátajú sa", () => {
  assertNull(completedWorkedMinutes({ arrival: "08:00" }));
});

test("nočná zmena 22:00–06:30 s fixnou prestávkou → 8h", () => {
  assertEqual(
    completedWorkedMinutes({ arrival: "22:00", departure: "06:30" }),
    480,
  );
});

test('formatHoursMinutes(480) → "8h 0m"', () =>
  assertEqual(formatHoursMinutes(480), "8h 0m"));

test('formatHoursMinutes(0) → "0h 0m"', () =>
  assertEqual(formatHoursMinutes(0), "0h 0m"));

test('formatHoursMinutes(135) → "2h 15m"', () =>
  assertEqual(formatHoursMinutes(135), "2h 15m"));

test("formatHoursMinutes neplatné → null", () => {
  assertNull(formatHoursMinutes(null));
  assertNull(formatHoursMinutes(NaN));
});

test('formatSignedHoursMinutes(30) → "+0h 30m"', () =>
  assertEqual(formatSignedHoursMinutes(30), "+0h 30m"));

test('formatSignedHoursMinutes(0) → "+0h 0m"', () =>
  assertEqual(formatSignedHoursMinutes(0), "+0h 0m"));

test('formatSignedHoursMinutes(-90) → "-1h 30m"', () =>
  assertEqual(formatSignedHoursMinutes(-90), "-1h 30m"));

// ----------------------------------------------------------------------------
category("8. Týždeň — zostavenie riadkov a súčet");
// ----------------------------------------------------------------------------

test("buildWeekDays: príchod bez odchodu ostane v riadku, nerátajú sa minúty", () => {
  const days = buildWeekDays(
    {
      "2026-09-07": {
        arrival: "08:00",
        break_start: "12:00",
        break_end: "12:30",
        departure: "16:30",
      },
      "2026-09-08": { arrival: "08:15" },
      "2026-09-09": { arrival: "07:00", departure: "15:30" },
    },
    "2026-09-07",
  );
  assertEqual(days.length, 7);
  assertEqual(days[0].date, "2026-09-07");
  assertEqual(days[0].complete, true);
  assertEqual(days[0].arrival, "08:00");
  assertEqual(days[0].departure, "16:30");
  assertEqual(days[0].breakStart, "12:00");
  assertEqual(days[0].breakEnd, "12:30");
  assertEqual(days[0].workedMinutes, 480);
  assertEqual(days[1].complete, false);
  assertEqual(days[1].arrival, "08:15");
  assertNull(days[1].departure);
  assertNull(days[1].workedMinutes);
  assertEqual(days[2].complete, true);
  assertEqual(days[2].workedMinutes, 480);
  assertEqual(days[5].complete, false);
  assertNull(days[5].arrival);
});

test("sumWeekWorkedMinutes sčíta uzavreté kúsky, príchod-only nie", () => {
  const days = buildWeekDays(
    {
      "2026-09-07": { arrival: "08:00", departure: "16:30" },
      "2026-09-08": { arrival: "08:00" },
      "2026-09-09": {
        arrival: "08:00",
        break_skipped: true,
        departure: "16:30",
      },
    },
    "2026-09-07",
  );
  assertEqual(sumWeekWorkedMinutes(days), 480 + 480);
});

test("sumWeekWorkedMinutes prázdneho týždňa → 0", () => {
  assertEqual(sumWeekWorkedMinutes(buildWeekDays({}, "2026-09-07")), 0);
});

test("sumWeekDiffMinutes: fond 5×8h k strede, príchod-only = −8h za utorok", () => {
  const days = buildWeekDays(
    {
      "2026-09-07": { arrival: "08:00", departure: "16:30" },
      "2026-09-08": { arrival: "08:15" },
      "2026-09-09": {
        arrival: "08:00",
        break_skipped: true,
        departure: "16:30",
      },
    },
    "2026-09-07",
  );
  // 16h odpracované vs 24h (Po–St), utorok len príchod
  assertEqual(sumWeekDiffMinutes(days, undefined, "2026-09-09"), -8 * 60);
});

test("canGoToNextWeek: z aktuálneho týždňa ďalej nie", () => {
  assertEqual(canGoToNextWeek("2026-09-07", "2026-09-09"), false);
});

test("canGoToNextWeek: z minulého týždňa späť na aktuálny áno", () => {
  assertEqual(canGoToNextWeek("2026-08-31", "2026-09-09"), true);
});

test("canGoToNextWeek z budúceho pondelka → false", () => {
  assertEqual(canGoToNextWeek("2026-09-14", "2026-09-09"), false);
});

// ----------------------------------------------------------------------------
category("9. Scenár — 40h fond Po–Pi, HO, skip, zabudnutý štvrtok");
// ----------------------------------------------------------------------------

const walkthroughWeek = {
  "2026-08-31": {
    arrival: "06:30",
    break_start: "11:00",
    break_end: "12:30",
    departure: "15:00",
  },
  "2026-09-01": {
    home_office: true,
    arrival: "08:00",
    break_start: "12:00",
    break_end: "12:30",
    departure: "16:30",
  },
  "2026-09-02": {
    arrival: "06:00",
    break_skipped: true,
    departure: "15:00",
  },
  "2026-09-03": { arrival: "06:00" },
  "2026-09-04": {
    arrival: "06:00",
    break_start: "12:30",
    break_end: "13:30",
    departure: "18:30",
  },
};

test("pondelok 06:30–15:00, prestávka 11:00–12:30, fix 30m → 8h", () => {
  assertEqual(completedWorkedMinutes(walkthroughWeek["2026-08-31"]), 8 * 60);
});

test("HO 08:00–16:30, 30m → 8h", () => {
  assertEqual(completedWorkedMinutes(walkthroughWeek["2026-09-01"]), 8 * 60);
});

test("streda skip + vypnutá reálna prestávka, 06:00–15:00 → 8h 30m", () => {
  assertEqual(
    completedWorkedMinutes(walkthroughWeek["2026-09-02"]),
    8 * 60 + 30,
  );
});

test("štvrtok len príchod → do odpracovaných 0", () => {
  assertNull(completedWorkedMinutes(walkthroughWeek["2026-09-03"]));
});

test("piatok 06:00–18:30, fix 30m → 12h", () => {
  assertEqual(completedWorkedMinutes(walkthroughWeek["2026-09-04"]), 12 * 60);
});

test("týždeň odpracované 36h 30m (24h 30m + 12h, nie 36h 0m)", () => {
  const days = buildWeekDays(walkthroughWeek, "2026-08-31");
  assertEqual(sumWeekWorkedMinutes(days), 36 * 60 + 30);
});

test("fond 40h Po–Pi, štvrtok −8h, deficit −3h 30m", () => {
  const days = buildWeekDays(walkthroughWeek, "2026-08-31");
  assertEqual(
    sumWeekDiffMinutes(days, undefined, "2026-09-07"),
    -(3 * 60 + 30),
  );
});
