// Testy pre scripts/settings.js — sanitize a parse, žiadny DOM.
import {
  DEFAULT_SETTINGS,
  sanitizeWorkHours,
  sanitizeBreakMinutes,
  sanitizeEarliestDeparture,
  sanitizeUseActualBreakTime,
  sanitizeSettings,
  parseSettingsJson,
  toMathSettings,
} from "../scripts/settings.js";

import { category, test, assertEqual, assertTrue } from "./_framework.js";

category("7. Settings — WORK_HOURS 1–23, default 8");

test("sanitizeWorkHours(8) → 8", () => assertEqual(sanitizeWorkHours(8), 8));
test("sanitizeWorkHours(1) → 1", () => assertEqual(sanitizeWorkHours(1), 1));
test("sanitizeWorkHours(23) → 23", () =>
  assertEqual(sanitizeWorkHours(23), 23));
test('sanitizeWorkHours("6") z inputu → 6', () =>
  assertEqual(sanitizeWorkHours("6"), 6));
test("sanitizeWorkHours(0) → 8", () => assertEqual(sanitizeWorkHours(0), 8));
test("sanitizeWorkHours(24) → 8", () => assertEqual(sanitizeWorkHours(24), 8));
test("sanitizeWorkHours(8.5) → 8", () =>
  assertEqual(sanitizeWorkHours(8.5), 8));
test("sanitizeWorkHours(NaN) → 8", () =>
  assertEqual(sanitizeWorkHours(Number.NaN), 8));
test("sanitizeWorkHours(null) → 8", () =>
  assertEqual(sanitizeWorkHours(null), 8));
test('sanitizeWorkHours("abc") → 8', () =>
  assertEqual(sanitizeWorkHours("abc"), 8));

category("8. Settings — BREAK_MINUTES 0–120, default 30");

test("sanitizeBreakMinutes(30) → 30", () =>
  assertEqual(sanitizeBreakMinutes(30), 30));
test("sanitizeBreakMinutes(1) → 1", () =>
  assertEqual(sanitizeBreakMinutes(1), 1));
test("sanitizeBreakMinutes(120) → 120", () =>
  assertEqual(sanitizeBreakMinutes(120), 120));
test('sanitizeBreakMinutes("45") → 45', () =>
  assertEqual(sanitizeBreakMinutes("45"), 45));
test("sanitizeBreakMinutes(0) → 0 (deň bez prestávky)", () =>
  assertEqual(sanitizeBreakMinutes(0), 0));
test("sanitizeBreakMinutes(-1) → 30", () =>
  assertEqual(sanitizeBreakMinutes(-1), 30));
test("sanitizeBreakMinutes(121) → 30", () =>
  assertEqual(sanitizeBreakMinutes(121), 30));
test("sanitizeBreakMinutes(NaN) → 30", () =>
  assertEqual(sanitizeBreakMinutes(Number.NaN), 30));

category("9. Settings — earliestDeparture HH:MM, default 15:00");

test('sanitizeEarliestDeparture("15:00") → 15:00', () =>
  assertEqual(sanitizeEarliestDeparture("15:00"), "15:00"));
test('sanitizeEarliestDeparture("00:00") → 00:00 (vypne podlahu)', () =>
  assertEqual(sanitizeEarliestDeparture("00:00"), "00:00"));
test('sanitizeEarliestDeparture("23:59") → 23:59', () =>
  assertEqual(sanitizeEarliestDeparture("23:59"), "23:59"));
test('sanitizeEarliestDeparture("24:00") → 15:00', () =>
  assertEqual(sanitizeEarliestDeparture("24:00"), "15:00"));
test("sanitizeEarliestDeparture(900) → 15:00 (nie surové minúty)", () =>
  assertEqual(sanitizeEarliestDeparture(900), "15:00"));
test("sanitizeEarliestDeparture(null) → 15:00", () =>
  assertEqual(sanitizeEarliestDeparture(null), "15:00"));

category("10. Settings — useActualBreakTime len boolean true");

test("sanitizeUseActualBreakTime(true) → true", () =>
  assertEqual(sanitizeUseActualBreakTime(true), true));
test("sanitizeUseActualBreakTime(false) → false", () =>
  assertEqual(sanitizeUseActualBreakTime(false), false));
test('sanitizeUseActualBreakTime("true") → false', () =>
  assertEqual(sanitizeUseActualBreakTime("true"), false));
test("sanitizeUseActualBreakTime(1) → false", () =>
  assertEqual(sanitizeUseActualBreakTime(1), false));
test("sanitizeUseActualBreakTime(null) → false", () =>
  assertEqual(sanitizeUseActualBreakTime(null), false));

category("11. Settings — sanitize objektu a JSON");

test("DEFAULT_SETTINGS má 8 / 30 / 15:00 / false", () => {
  assertEqual(DEFAULT_SETTINGS.workHours, 8);
  assertEqual(DEFAULT_SETTINGS.breakMinutes, 30);
  assertEqual(DEFAULT_SETTINGS.earliestDeparture, "15:00");
  assertEqual(DEFAULT_SETTINGS.useActualBreakTime, false);
});

test("sanitizeSettings({}) doplní defaulty", () => {
  const s = sanitizeSettings({});
  assertEqual(s.workHours, 8);
  assertEqual(s.breakMinutes, 30);
  assertEqual(s.earliestDeparture, "15:00");
  assertEqual(s.useActualBreakTime, false);
});

test("sanitizeSettings podstrčí garbage a clampne", () => {
  const s = sanitizeSettings({
    workHours: 99,
    breakMinutes: -5,
    earliestDeparture: "nope",
    useActualBreakTime: "yes",
  });
  assertEqual(s.workHours, 8);
  assertEqual(s.breakMinutes, 30);
  assertEqual(s.earliestDeparture, "15:00");
  assertEqual(s.useActualBreakTime, false);
});

test("parseSettingsJson neplatný JSON → defaulty, nehodí", () => {
  const s = parseSettingsJson("{not json");
  assertEqual(s.workHours, 8);
});

test("parseSettingsJson null/empty → defaulty", () => {
  assertEqual(parseSettingsJson(null).workHours, 8);
  assertEqual(parseSettingsJson("").workHours, 8);
});

test("parseSettingsJson platný JSON → sanitize", () => {
  const s = parseSettingsJson(
    '{"workHours":6,"breakMinutes":20,"earliestDeparture":"14:00","useActualBreakTime":true}',
  );
  assertEqual(s.workHours, 6);
  assertEqual(s.breakMinutes, 20);
  assertEqual(s.earliestDeparture, "14:00");
  assertEqual(s.useActualBreakTime, true);
});

test("toMathSettings mapuje 15:00 → 900 minút", () => {
  const m = toMathSettings({
    workHours: 7,
    breakMinutes: 45,
    earliestDeparture: "15:00",
    useActualBreakTime: true,
  });
  assertEqual(m.workHours, 7);
  assertEqual(m.breakMinutes, 45);
  assertEqual(m.earliestDepartureMinutes, 900);
  assertEqual(m.useActualBreakTime, true);
});

test("toMathSettings pri garbage earliest → 900", () => {
  const m = toMathSettings({ earliestDeparture: "xx" });
  assertEqual(m.earliestDepartureMinutes, 900);
  assertTrue(m.workHours === 8);
});
