// Testy pre scripts/validation.js
import {
  validateBreakStart,
  validateBreakEnd,
  validateDeparture,
} from "../scripts/validation.js";

import { category, test, assertTrue, assertFalse } from "./_framework.js";

// ----------------------------------------------------------------------------
category("6. Validácie");
// ----------------------------------------------------------------------------

test("validateBreakStart - bez príchodu → ok:false + error", () => {
  const r = validateBreakStart({});
  assertFalse(r.ok);
  assertTrue(r.error.includes("príchod"));
});

test("validateBreakStart - s príchodom → ok:true", () => {
  assertTrue(validateBreakStart({ arrival: "08:00" }).ok);
});

test("validateBreakStart - neplatný príchod → ok:false + error", () => {
  const r = validateBreakStart({ arrival: "24:00" });
  assertFalse(r.ok);
  assertTrue(r.error.includes("Neplatný čas"));
});

test("validateBreakEnd - bez začiatku prestávky → ok:false + error", () => {
  const r = validateBreakEnd({ arrival: "08:00" }, 750);
  assertFalse(r.ok);
  assertTrue(r.error.includes("prestávku"));
});

test("validateBreakEnd - bez príchodu, ale s break_start → ok:false + error", () => {
  const r = validateBreakEnd({ break_start: "12:00" }, 750);
  assertFalse(r.ok);
  assertTrue(r.error.includes("príchod"));
});

test("validateBreakEnd - poškodený break_start → ok:false + error", () => {
  const r = validateBreakEnd({ arrival: "08:00", break_start: "12:99" }, 750);
  assertFalse(r.ok);
  assertTrue(r.error.includes("začiatok prestávky"));
});

test("validateBreakEnd - neplatný aktuálny čas → ok:false + error", () => {
  const r = validateBreakEnd({ arrival: "08:00", break_start: "12:00" }, 1440);
  assertFalse(r.ok);
  assertTrue(r.error.includes("aktuálny čas"));
});

test("validateBreakEnd - koniec pred začiatkom (rovnaký deň) → ok:false + error", () => {
  const r = validateBreakEnd({ arrival: "08:00", break_start: "12:00" }, 700);
  assertFalse(r.ok);
});

test("validateBreakEnd - platný koniec → ok:true", () => {
  assertTrue(
    validateBreakEnd({ arrival: "08:00", break_start: "12:00" }, 750).ok,
  );
});

test("validateDeparture - bez príchodu → ok:false + error", () => {
  const r = validateDeparture({}, 990);
  assertFalse(r.ok);
});

test("validateDeparture - neplatný príchod → ok:false + error", () => {
  const r = validateDeparture({ arrival: "xx:yy" }, 990);
  assertFalse(r.ok);
  assertTrue(r.error.includes("príchod"));
});

test("validateDeparture - neplatný aktuálny čas → ok:false + error", () => {
  const r = validateDeparture({ arrival: "08:00" }, -1);
  assertFalse(r.ok);
  assertTrue(r.error.includes("aktuálny čas"));
});

test("validateDeparture - prestávka neukončená → ok:false + error", () => {
  const r = validateDeparture({ arrival: "08:00", break_start: "12:00" }, 990);
  assertFalse(r.ok);
});

test("validateDeparture - poškodený break_start → ok:false + error", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:99", break_end: "13:00" },
    990,
  );
  assertFalse(r.ok);
  assertTrue(r.error.includes("začiatok prestávky"));
});

test("validateDeparture - poškodený break_end → ok:false + error", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:00", break_end: "13:99" },
    990,
  );
  assertFalse(r.ok);
  assertTrue(r.error.includes("koniec prestávky"));
});

test("validateDeparture - odchod pred koncom prestávky → ok:false + error", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
    720,
  );
  assertFalse(r.ok);
});

test("validateDeparture - platný odchod načas → ok:true, bez warning", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
    990,
  );
  assertTrue(r.ok);
  assertTrue(r.warning === undefined);
});

test("validateDeparture - skorý odchod o 1h30m → ok:true + warning", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
    900,
  );
  assertTrue(r.ok);
  assertTrue(r.warning !== undefined);
  assertTrue(r.warning.includes("1h 30m"));
});

test("validateDeparture - skorý odchod o 30min → ok:true + warning", () => {
  const r = validateDeparture(
    { arrival: "08:00", break_start: "12:00", break_end: "12:30" },
    960,
  );
  assertTrue(r.ok);
  assertTrue(r.warning !== undefined);
  assertTrue(r.warning.includes("30m"));
});

test("validateDeparture - preskočená prestávka, platný odchod → ok:true bez warning", () => {
  const r = validateDeparture({ arrival: "08:00" }, 990);
  assertTrue(r.ok);
  assertTrue(r.warning === undefined);
});

test("validateDeparture - NOČNÁ, príchod 22:00, odchod 06:30 → ok:true bez warning", () => {
  const r = validateDeparture(
    { arrival: "22:00", break_start: "23:00", break_end: "23:30" },
    390,
  );
  assertTrue(r.ok);
  assertTrue(r.warning === undefined);
});

test("validateDeparture - fond 6h bez podlahy, 14:30 nie je skorý odchod", () => {
  const r = validateDeparture({ arrival: "08:00" }, 14 * 60 + 30, {
    workHours: 6,
    breakMinutes: 30,
    earliestDepartureMinutes: 0,
    useActualBreakTime: false,
  });
  assertTrue(r.ok);
  assertTrue(r.warning === undefined);
});

test("validateDeparture - skip, 06:04 → 14:34 nie je skorý odchod", () => {
  const r = validateDeparture(
    { arrival: "06:04", break_skipped: true },
    14 * 60 + 34,
    {
      workHours: 8,
      breakMinutes: 30,
      earliestDepartureMinutes: 0,
      useActualBreakTime: false,
    },
  );
  assertTrue(r.ok);
  assertTrue(r.warning === undefined);
});
