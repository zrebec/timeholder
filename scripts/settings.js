// ============================================================================
// Work settings — sanitize + parse. Žiadny DOM.
// localStorage kľúč work_settings; work_records sa odtiaľto nikdy nezapisuje.
// ============================================================================

import { parseTimeToMinutes } from "./time-math.js";

export const SETTINGS_KEY = "work_settings";

export const DEFAULT_SETTINGS = {
  workHours: 8,
  breakMinutes: 30,
  earliestDeparture: "15:00",
  useActualBreakTime: false,
};

function parseWholeInt(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

export function sanitizeWorkHours(value) {
  const n = parseWholeInt(value);
  if (n === null || n < 1 || n > 23) return DEFAULT_SETTINGS.workHours;
  return n;
}

export function sanitizeBreakMinutes(value) {
  const n = parseWholeInt(value);
  if (n === null || n < 0 || n > 120) return DEFAULT_SETTINGS.breakMinutes;
  return n;
}

export function sanitizeEarliestDeparture(value) {
  if (typeof value !== "string") return DEFAULT_SETTINGS.earliestDeparture;
  if (parseTimeToMinutes(value) === null) {
    return DEFAULT_SETTINGS.earliestDeparture;
  }
  return value;
}

export function sanitizeUseActualBreakTime(value) {
  return value === true;
}

export function sanitizeSettings(raw) {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    workHours: sanitizeWorkHours(source.workHours),
    breakMinutes: sanitizeBreakMinutes(source.breakMinutes),
    earliestDeparture: sanitizeEarliestDeparture(source.earliestDeparture),
    useActualBreakTime: sanitizeUseActualBreakTime(source.useActualBreakTime),
  };
}

export function parseSettingsJson(raw) {
  if (raw == null || raw === "") {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function toMathSettings(raw) {
  const s = sanitizeSettings(raw);
  return {
    workHours: s.workHours,
    breakMinutes: s.breakMinutes,
    earliestDepartureMinutes: parseTimeToMinutes(s.earliestDeparture),
    useActualBreakTime: s.useActualBreakTime,
  };
}

export function loadSettings() {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }
  return parseSettingsJson(localStorage.getItem(SETTINGS_KEY));
}

export function saveSettings(raw) {
  const s = sanitizeSettings(raw);
  if (typeof localStorage === "undefined") return s;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  return s;
}
