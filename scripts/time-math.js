// ============================================================================
// Pure time/math utilities — no DOM, no globals, plne testovateľné.
// ============================================================================

export const WORK_HOURS = 8;
export const BREAK_MINUTES = 30;
export const EARLIEST_DEPARTURE_MINUTES = 15 * 60; // 15:00
export const USE_ACTUAL_BREAK_TIME = false;

function resolveMathSettings(settings) {
  return {
    workHours:
      settings && Number.isInteger(settings.workHours)
        ? settings.workHours
        : WORK_HOURS,
    breakMinutes:
      settings && Number.isInteger(settings.breakMinutes)
        ? settings.breakMinutes
        : BREAK_MINUTES,
    earliestDepartureMinutes:
      settings && Number.isInteger(settings.earliestDepartureMinutes)
        ? settings.earliestDepartureMinutes
        : EARLIEST_DEPARTURE_MINUTES,
    useActualBreakTime:
      settings?.useActualBreakTime === true ? true : USE_ACTUAL_BREAK_TIME,
  };
}

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function isValidMinuteOfDay(value) {
  return Number.isInteger(value) && value >= 0 && value < 1440;
}

export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== "string") return null;

  const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const [, h, m] = match;
  return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
}

// Display absolute minutes as HH:MM (wraps at 24h)
export function minutesToDisplay(absMinutes) {
  if (!Number.isFinite(absMinutes)) return "--:--";
  const m = ((absMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// Convert raw HH:MM minutes to absolute minutes, handling midnight crossing relative to arrival
export function toAbsMin(rawMin, arrivalMin) {
  if (!isValidMinuteOfDay(rawMin) || !isValidMinuteOfDay(arrivalMin))
    return null;
  return rawMin < arrivalMin ? rawMin + 1440 : rawMin;
}

export const HOME_OFFICE_WORKED_MINUTES = WORK_HOURS * 60;

export function homeOfficeStamp() {
  return {
    home_office: true,
    arrival: "08:00",
    break_start: "12:00",
    break_end: "12:30",
    departure: "16:30",
  };
}

export function getBreakDuration(rec, settings) {
  const { breakMinutes, useActualBreakTime } = resolveMathSettings(settings);
  if (rec?.break_skipped === true) {
    return useActualBreakTime ? 0 : breakMinutes;
  }
  if (!rec.break_start || !rec.break_end) return breakMinutes;
  if (!useActualBreakTime) return breakMinutes;

  const breakStartMin = parseTimeToMinutes(rec.break_start);
  const breakEndMin = parseTimeToMinutes(rec.break_end);
  if (!isValidMinuteOfDay(breakStartMin) || !isValidMinuteOfDay(breakEndMin)) {
    return breakMinutes;
  }

  const actual = breakEndMin - breakStartMin;
  return actual >= 0 ? actual : breakMinutes;
}

// Planned departure in absolute minutes (midnight-safe)
export function getPlannedDepartureAbsMin(rec, settings) {
  const { workHours, earliestDepartureMinutes } = resolveMathSettings(settings);
  const arrivalMin = parseTimeToMinutes(rec.arrival);
  if (!isValidMinuteOfDay(arrivalMin)) return null;

  const planned = arrivalMin + workHours * 60 + getBreakDuration(rec, settings);
  // Only apply earliest-departure restriction for same-day departures
  return planned < 1440 ? Math.max(planned, earliestDepartureMinutes) : planned;
}

/**
 * Compute worked minutes given a record and current minute-of-day.
 * Pure: nowMin must be passed in (no global state).
 */
export function calculateWorkedMinutes(rec, nowMin, settings) {
  const { breakMinutes, useActualBreakTime } = resolveMathSettings(settings);
  const arrivalMin = parseTimeToMinutes(rec.arrival);
  if (!isValidMinuteOfDay(arrivalMin) || !isValidMinuteOfDay(nowMin))
    return null;

  const nowAbsMin = toAbsMin(nowMin, arrivalMin);

  if (rec.break_skipped === true) {
    const skippedBreak = getBreakDuration(rec, settings);
    return Math.max(0, nowAbsMin - arrivalMin - skippedBreak);
  }

  if (!rec.break_start) return nowAbsMin - arrivalMin;

  const breakStartMin = parseTimeToMinutes(rec.break_start);
  const breakStartAbsMin = toAbsMin(breakStartMin, arrivalMin);
  if (breakStartAbsMin === null) return null;

  if (nowAbsMin < breakStartAbsMin) return nowAbsMin - arrivalMin;
  if (!rec.break_end) return breakStartAbsMin - arrivalMin;

  const breakEndMin = parseTimeToMinutes(rec.break_end);
  const breakEndAbsMin = toAbsMin(breakEndMin, arrivalMin);
  if (breakEndAbsMin === null) return null;

  if (nowAbsMin < breakEndAbsMin) return breakStartAbsMin - arrivalMin;

  if (useActualBreakTime) {
    return breakStartAbsMin - arrivalMin + (nowAbsMin - breakEndAbsMin);
  }
  return nowAbsMin - arrivalMin - breakMinutes;
}

// ============================================================================
// Week calendar — civil YYYY-MM-DD via Date.UTC, never Date.now().
// ============================================================================

const DATE_STR_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseCivilDate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const match = dateStr.match(DATE_STR_RE);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return utc;
}

function formatCivilDate(utc) {
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

export function addCalendarDays(dateStr, n) {
  if (!Number.isInteger(n)) return null;
  const utc = parseCivilDate(dateStr);
  if (!utc) return null;
  utc.setUTCDate(utc.getUTCDate() + n);
  return formatCivilDate(utc);
}

export function mondayOfWeek(dateStr) {
  const utc = parseCivilDate(dateStr);
  if (!utc) return null;
  const weekday = utc.getUTCDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return formatCivilDate(utc);
}

export function weekDates(mondayStr) {
  if (!parseCivilDate(mondayStr)) return null;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addCalendarDays(mondayStr, i);
    if (!date) return null;
    days.push(date);
  }
  return days;
}

export function isCompleteRecord(rec) {
  if (!rec || typeof rec !== "object") return false;
  return (
    parseTimeToMinutes(rec.arrival) !== null &&
    parseTimeToMinutes(rec.departure) !== null
  );
}

export function completedWorkedMinutes(rec, settings) {
  if (rec?.home_office === true) return HOME_OFFICE_WORKED_MINUTES;
  if (!isCompleteRecord(rec)) return null;
  const arrivalMin = parseTimeToMinutes(rec.arrival);
  const departureAbsMin = toAbsMin(
    parseTimeToMinutes(rec.departure),
    arrivalMin,
  );
  if (departureAbsMin === null) return null;
  return departureAbsMin - arrivalMin - getBreakDuration(rec, settings);
}

export function closedPieceWorkedMinutes(rec, settings) {
  if (!rec || typeof rec !== "object") return null;
  if (rec.home_office === true) return HOME_OFFICE_WORKED_MINUTES;
  if (parseTimeToMinutes(rec.arrival) === null) return null;
  if (parseTimeToMinutes(rec.departure) !== null) {
    return completedWorkedMinutes(rec, settings);
  }
  if (rec.break_skipped === true) return null;
  const breakStartMin = parseTimeToMinutes(rec.break_start);
  if (breakStartMin === null) return null;
  const arrivalMin = parseTimeToMinutes(rec.arrival);
  const breakAbs = toAbsMin(breakStartMin, arrivalMin);
  if (breakAbs === null) return null;
  return breakAbs - arrivalMin;
}

export function formatHoursMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return null;
  const rounded = Math.trunc(totalMinutes);
  return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
}

export function formatSignedHoursMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return null;
  const sign = totalMinutes >= 0 ? "+" : "-";
  return `${sign}${formatHoursMinutes(Math.abs(totalMinutes))}`;
}

function recordedTime(value) {
  return parseTimeToMinutes(value) !== null ? value : null;
}

export function buildWeekDays(records, mondayStr, settings) {
  const dates = weekDates(mondayStr);
  if (!dates) return [];
  const source =
    records && typeof records === "object" && !Array.isArray(records)
      ? records
      : {};
  return dates.map((date) => {
    const rec = source[date];
    const homeOffice = rec?.home_office === true;
    const stamp = homeOffice ? homeOfficeStamp() : null;
    const worked = closedPieceWorkedMinutes(rec, settings);
    const src = homeOffice ? stamp : rec;
    return {
      date,
      complete: homeOffice || isCompleteRecord(rec),
      homeOffice,
      arrival: homeOffice ? stamp.arrival : recordedTime(rec?.arrival),
      departure: homeOffice ? stamp.departure : recordedTime(rec?.departure),
      breakStart: recordedTime(src?.break_start),
      breakEnd: recordedTime(src?.break_end),
      breakSkipped: rec?.break_skipped === true,
      workedMinutes: worked,
    };
  });
}

export function sumWeekWorkedMinutes(days) {
  if (!Array.isArray(days)) return 0;
  let total = 0;
  for (const day of days) {
    if (Number.isFinite(day?.workedMinutes)) {
      total += day.workedMinutes;
    }
  }
  return total;
}

export function weekExpectedMinutes(mondayStr, asOfDateStr, settings) {
  const dates = weekDates(mondayStr);
  if (!dates || typeof asOfDateStr !== "string") return 0;
  const { workHours } = resolveMathSettings(settings);
  let count = 0;
  for (let i = 0; i < 5; i++) {
    if (dates[i] <= asOfDateStr) count++;
  }
  return count * workHours * 60;
}

export function sumWeekDiffMinutes(days, settings, asOfDateStr) {
  if (!Array.isArray(days) || days.length === 0) return 0;
  const expected = weekExpectedMinutes(days[0].date, asOfDateStr, settings);
  return sumWeekWorkedMinutes(days) - expected;
}

export function canGoToNextWeek(mondayStr, todayStr) {
  const nextMonday = addCalendarDays(mondayStr, 7);
  const currentMonday = mondayOfWeek(todayStr);
  if (!nextMonday || !currentMonday) return false;
  return nextMonday <= currentMonday;
}
