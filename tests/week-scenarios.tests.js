// Scenáre týždňa — rovnaké JSON ako DEV ?seed=1…4
import {
  buildWeekDays,
  sumWeekWorkedMinutes,
  sumWeekDiffMinutes,
  weekExpectedMinutes,
  formatHoursMinutes,
} from "../scripts/time-math.js";
import { SEED_WEEKS } from "../scripts/playtest-weeks.js";
import { category, test, assertEqual, assertNull } from "./_framework.js";

const AS_OF = "2026-09-07";

const FUND_8 = {
  workHours: 8,
  breakMinutes: 30,
  earliestDepartureMinutes: 15 * 60,
  useActualBreakTime: false,
};

const FUND_7 = { ...FUND_8, workHours: 7 };
const FUND_9 = { ...FUND_8, workHours: 9 };

function weekStats(key, settings = FUND_8) {
  const { monday, records } = SEED_WEEKS[key];
  const days = buildWeekDays(records, monday, settings);
  return {
    days,
    worked: sumWeekWorkedMinutes(days),
    expected: weekExpectedMinutes(monday, AS_OF, settings),
    diff: sumWeekDiffMinutes(days, settings, AS_OF),
  };
}

category("10. Scenár 1 — 5 vyplnených dní, bez HO, prebytok 2h");

test("seed 1: Po–Št 8h, Pi 10h → 42h vs 40h = +2h", () => {
  const s = weekStats("1");
  assertEqual(s.expected, 40 * 60);
  assertEqual(s.worked, 42 * 60);
  assertEqual(s.diff, 2 * 60);
  assertEqual(formatHoursMinutes(s.worked), "42h 0m");
});

test("seed 1: denný fond 7h → očakávané 35h, prebytok +7h", () => {
  const s = weekStats("1", FUND_7);
  assertEqual(s.expected, 35 * 60);
  assertEqual(s.worked, 42 * 60);
  assertEqual(s.diff, 7 * 60);
});

test("seed 1: denný fond 9h → očakávané 45h, deficit −3h", () => {
  const s = weekStats("1", FUND_9);
  assertEqual(s.expected, 45 * 60);
  assertEqual(s.worked, 42 * 60);
  assertEqual(s.diff, -3 * 60);
});

category("11. Scenár 2 — 2× HO, deficit 2h pri fonde 8h");

test("seed 2: 2× HO + 2× 8h + 6h → 38h vs 40h = −2h", () => {
  const s = weekStats("2");
  assertEqual(s.days[1].homeOffice, true);
  assertEqual(s.days[3].homeOffice, true);
  assertEqual(s.days[1].breakStart, "12:00");
  assertEqual(s.days[1].breakEnd, "12:30");
  assertEqual(s.days[1].workedMinutes, 8 * 60);
  assertEqual(s.days[4].workedMinutes, 6 * 60);
  assertEqual(s.expected, 40 * 60);
  assertEqual(s.worked, 38 * 60);
  assertEqual(s.diff, -2 * 60);
});

test("seed 2: HO ostáva 8h aj pri dennom fonde 9h (očakávané 45h)", () => {
  const s = weekStats("2", FUND_9);
  assertEqual(s.days[1].workedMinutes, 8 * 60);
  assertEqual(s.expected, 45 * 60);
  assertEqual(s.worked, 38 * 60);
  assertEqual(s.diff, -7 * 60);
});

test("seed 2: denný fond 7h → očakávané 35h, prebytok +3h", () => {
  const s = weekStats("2", FUND_7);
  assertEqual(s.expected, 35 * 60);
  assertEqual(s.worked, 38 * 60);
  assertEqual(s.diff, 3 * 60);
});

category("12. Scenár 3 — jeden deň len do prestávky");

test("seed 3: St 06:00–10:00 (4h), ostatné 8h → 36h vs 40h = −4h", () => {
  const s = weekStats("3");
  assertEqual(s.days[2].complete, false);
  assertEqual(s.days[2].arrival, "06:00");
  assertNull(s.days[2].departure);
  assertEqual(s.days[2].workedMinutes, 4 * 60);
  assertEqual(s.worked, 36 * 60);
  assertEqual(s.expected, 40 * 60);
  assertEqual(s.diff, -4 * 60);
});

category("13. Scenár 4 — celý týždeň len príchod");

test("seed 4: Po–Pi len 06:10 → 0 odpracovaných, −40h pri fonde 8h", () => {
  const s = weekStats("4");
  for (let i = 0; i < 5; i++) {
    assertEqual(s.days[i].arrival, "06:10");
    assertEqual(s.days[i].complete, false);
    assertEqual(s.days[i].workedMinutes, null);
  }
  assertEqual(s.worked, 0);
  assertEqual(s.expected, 40 * 60);
  assertEqual(s.diff, -40 * 60);
});

test("seed 4: denný fond 7h → deficit −35h; 9h → −45h", () => {
  const seven = weekStats("4", FUND_7);
  const nine = weekStats("4", FUND_9);
  assertEqual(seven.worked, 0);
  assertEqual(seven.expected, 35 * 60);
  assertEqual(seven.diff, -35 * 60);
  assertEqual(nine.expected, 45 * 60);
  assertEqual(nine.diff, -45 * 60);
});
