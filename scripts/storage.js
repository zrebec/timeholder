// ============================================================================
// localStorage wrapper — work_records / theme / last_table_date.
// Settings sem nepatria (scripts/settings.js, kľúč work_settings).
// JSON.parse je vždy v try/catch: poškodené dáta = {}.
// ============================================================================

export const RECORDS_KEY = "work_records";
export const THEME_KEY = "theme";
export const LAST_TABLE_DATE_KEY = "last_table_date";

export function parseRecordsJson(raw) {
  if (raw == null || raw === "") return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function countRecordDays(records) {
  if (!records || typeof records !== "object" || Array.isArray(records)) {
    return 0;
  }
  return Object.keys(records).length;
}

export function buildExportPayload(records, exportedAt = new Date()) {
  const copy = parseRecordsJson(JSON.stringify(records ?? {}));
  return {
    app: "TimeHolder",
    exportedAt: exportedAt.toISOString(),
    records: copy,
  };
}

function storageAvailable() {
  return typeof localStorage !== "undefined";
}

export function loadAllRecords() {
  if (!storageAvailable()) return {};
  return parseRecordsJson(localStorage.getItem(RECORDS_KEY));
}

export function saveAllRecords(records) {
  if (!storageAvailable()) return;
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadTodayRecord(today) {
  return loadAllRecords()[today] || {};
}

export function saveTodayEvent(today, eventType, time) {
  const records = loadAllRecords();
  if (!records[today]) records[today] = {};
  records[today][eventType] = time;
  saveAllRecords(records);
}

export function setTodayField(today, key, value) {
  const records = loadAllRecords();
  if (!records[today]) records[today] = {};
  records[today][key] = value;
  saveAllRecords(records);
}

export function deleteTodayEvent(today, eventType) {
  const records = loadAllRecords();
  if (!records[today]) return;
  delete records[today][eventType];
  saveAllRecords(records);
}

export function saveDayRecord(date, rec) {
  if (!storageAvailable()) return;
  const records = loadAllRecords();
  records[date] = rec;
  saveAllRecords(records);
}

export function deleteDayRecord(date) {
  if (!storageAvailable()) return;
  const records = loadAllRecords();
  delete records[date];
  saveAllRecords(records);
}

export function loadTheme() {
  if (!storageAvailable()) return "dark";
  return localStorage.getItem(THEME_KEY) || "dark";
}

export function saveTheme(theme) {
  if (!storageAvailable()) return;
  localStorage.setItem(THEME_KEY, theme);
}

export function loadLastTableDate() {
  if (!storageAvailable()) return null;
  return localStorage.getItem(LAST_TABLE_DATE_KEY);
}

export function saveLastTableDate(date) {
  if (!storageAvailable()) return;
  localStorage.setItem(LAST_TABLE_DATE_KEY, date);
}
