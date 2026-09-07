// ============================================================================
// UI module — DOM rendering, state, storage, validators, handlers.
// Pure logic lives in time-math.js; this module imports from there.
// ============================================================================

import {
  pad,
  parseTimeToMinutes,
  minutesToDisplay,
  toAbsMin,
  getBreakDuration,
  getPlannedDepartureAbsMin,
  calculateWorkedMinutes,
  addCalendarDays,
  mondayOfWeek,
  buildWeekDays,
  sumWeekWorkedMinutes,
  sumWeekDiffMinutes,
  canGoToNextWeek,
  formatHoursMinutes,
  formatSignedHoursMinutes,
  homeOfficeStamp,
  closedPieceWorkedMinutes,
} from "./time-math.js";

import {
  validateBreakStart,
  validateBreakEnd,
  validateDeparture,
} from "./validation.js";

import { loadSettings, saveSettings, toMathSettings } from "./settings.js";
import { applyPlaytestSeed } from "./dev-seed.js";

import {
  loadAllRecords,
  loadTodayRecord as loadTodayFromStorage,
  saveTodayEvent,
  setTodayField,
  deleteTodayEvent,
  loadTheme as loadStoredTheme,
  saveTheme,
  loadLastTableDate,
  saveLastTableDate,
  saveDayRecord,
  deleteDayRecord,
  countRecordDays,
  buildExportPayload,
} from "./storage.js";

// ============================================================================
// CONFIG
// ============================================================================

// DEV when accessed via localhost / 127.* / LAN private ranges
// (vite dev s --host listenuje na LAN IP, treba ich zahrnúť aby
//  pri testovaní z telefónu cez vite dev sa SW neregistroval).
export const DEV_MODE =
  globalThis.location !== undefined &&
  /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
    globalThis.location.hostname,
  );

const HAPTIC_DEFAULT = 15;

const STATE_CONFIG = {
  arrival: {
    next: "break_start",
    event: "arrival",
    label: "➡️ Príchod",
    showSkip: false,
    disabled: false,
  },
  break_start: {
    next: "break_end",
    event: "break_start",
    label: "▶️ Prestávka",
    showSkip: true,
    disabled: false,
  },
  break_end: {
    next: "departure",
    event: "break_end",
    label: "⏹️ Koniec prestávky",
    showSkip: false,
    disabled: false,
  },
  departure: {
    next: "finished",
    event: "departure",
    label: "⬅️ Odchod",
    showSkip: false,
    disabled: false,
  },
  finished: {
    next: null,
    event: null,
    label: "🥳 Deň ukončený",
    showSkip: false,
    disabled: true,
  },
};

const WEEKDAY_SHORT = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

const VALIDATORS = {
  break_start: validateBreakStart,
  break_end: validateBreakEnd,
  departure: validateDeparture,
};

// ============================================================================
// MODULE STATE
// ============================================================================

let hours = 0;
let minutes = 0;
let holdInterval = null;
let holdTimeout = null;
let appState = "arrival";
let now = null;
let currentSettings = loadSettings();
let weekMonday = null;

function mathCfg() {
  return toMathSettings(currentSettings);
}

// ============================================================================
// TIME / STORAGE HELPERS
// ============================================================================

function getCurrentTimeZoneDateTime() {
  const formatter = new Intl.DateTimeFormat("sk-SK", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    dateString() {
      return `${this.year}-${this.month}-${this.day}`;
    },
  };
}

function getNowMin() {
  return Number.parseInt(now.hour) * 60 + Number.parseInt(now.minute);
}

function saveTimeRecord(eventType) {
  const time = `${pad(hours)}:${pad(minutes)}`;
  const today = getCurrentTimeZoneDateTime().dateString();
  saveTodayEvent(today, eventType, time);
  if (DEV_MODE) console.log(`[SAVE] ${eventType}: ${time}`);
}

function loadTodayRecord() {
  const today = getCurrentTimeZoneDateTime().dateString();
  return loadTodayFromStorage(today);
}

function determineAppState() {
  const r = loadTodayRecord();
  if (r.home_office) return "finished";
  if (!r.arrival) return "arrival";
  if (r.break_skipped) return r.departure ? "finished" : "departure";
  if (!r.break_start) return "break_start";
  if (!r.break_end) return "break_end";
  if (!r.departure) return "departure";
  return "finished";
}

// ============================================================================
// HAPTIC
// ============================================================================

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function hapticForMessage(type) {
  if (type === "success") vibrate(20);
  else if (type === "warning") vibrate([30, 60, 30]);
  else if (type === "error") vibrate([60, 40, 60]);
}

// ============================================================================
// MESSAGE BOX
// ============================================================================

function showMessage(text, type = "success") {
  const box = document.getElementById("messageBox");
  const txt = document.getElementById("messageText");
  if (!box || !txt) return;
  txt.textContent = text;
  box.className = `message-box ${type}`;
  box.classList.remove("hidden");
  const delay = { success: 2000, error: 4000, warning: 8000 }[type] || 3000;
  setTimeout(() => box.classList.add("hidden"), delay);
  hapticForMessage(type);
}

// ============================================================================
// WEEK CALENDAR
// ============================================================================

function formatWeekLabel(mondayStr) {
  const sunday = addCalendarDays(mondayStr, 6);
  if (!sunday) return "";
  const start = formatSkDayMonth(mondayStr);
  const end = formatSkDayMonth(sunday);
  const monthOf = (label) => label.replace(/^\d+\.\s*/, "");
  if (monthOf(start) === monthOf(end)) {
    const startDay = start.match(/^\d+\./)?.[0];
    if (startDay) return `${startDay} – ${end}`;
  }
  return `${start} – ${end}`;
}

function formatSkDayMonth(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
  });
}

function dashOr(value) {
  return value || "—";
}

function weekSubLine(day) {
  const parts = [];
  if (day.breakSkipped) parts.push("preskočená");
  else if (day.breakStart && day.breakEnd) {
    parts.push(`${day.breakStart}–${day.breakEnd}`);
  } else if (day.breakStart) {
    parts.push(`${day.breakStart}–—`);
  }
  const worked = formatHoursMinutes(day.workedMinutes);
  if (worked) parts.push(worked);
  return parts.join(" · ");
}

function renderWeek() {
  const today = getCurrentTimeZoneDateTime().dateString();
  if (!weekMonday) weekMonday = mondayOfWeek(today);

  const label = document.getElementById("week-label");
  if (label) label.textContent = formatWeekLabel(weekMonday);

  const nextBtn = document.getElementById("week-next");
  if (nextBtn) nextBtn.disabled = !canGoToNextWeek(weekMonday, today);

  const tbody = document.getElementById("week-days");
  if (!tbody) return;
  tbody.replaceChildren();

  const days = buildWeekDays(loadAllRecords(), weekMonday, mathCfg());
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const tr = document.createElement("tr");
    if (day.date === today) {
      tr.classList.add("is-today");
      tr.setAttribute("aria-current", "date");
    }
    if (day.arrival && !day.complete) tr.classList.add("is-incomplete");

    const name = document.createElement("th");
    name.scope = "row";
    name.className = "week-day-name";
    const dayNum = Number.parseInt(day.date.slice(8), 10);
    name.textContent = day.homeOffice
      ? `${WEEKDAY_SHORT[i]} ${dayNum}. HO`
      : `${WEEKDAY_SHORT[i]} ${dayNum}.`;

    const arrival = document.createElement("td");
    arrival.className = "week-time week-arrival";
    arrival.textContent = dashOr(day.arrival);

    const departure = document.createElement("td");
    departure.className = "week-time week-departure";
    departure.textContent = dashOr(day.departure);

    tr.append(name, arrival, departure);
    tbody.appendChild(tr);

    const subText = weekSubLine(day);
    if (subText) {
      const sub = document.createElement("tr");
      sub.className = "week-sub";
      if (day.date === today) sub.classList.add("is-today");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      const worked = formatHoursMinutes(day.workedMinutes);
      if (worked && subText.endsWith(worked)) {
        const prefix = subText.slice(0, subText.length - worked.length);
        cell.append(prefix);
        const strong = document.createElement("b");
        strong.textContent = worked;
        cell.appendChild(strong);
      } else {
        cell.textContent = subText;
      }
      sub.appendChild(cell);
      tbody.appendChild(sub);
    }
  }

  const total = document.getElementById("week-total");
  if (total) {
    const worked = formatHoursMinutes(sumWeekWorkedMinutes(days));
    const diff = sumWeekDiffMinutes(days, mathCfg(), today);
    const diffLabel = formatSignedHoursMinutes(diff);
    total.replaceChildren();
    total.append(`Týždeň: ${worked} `);
    const diffEl = document.createElement("span");
    diffEl.className =
      diff >= 0 ? "week-diff is-surplus" : "week-diff is-deficit";
    diffEl.textContent = `(${diffLabel})`;
    total.appendChild(diffEl);
  }
}

export function shiftWeek(delta) {
  if (delta !== -1 && delta !== 1) return;
  const today = getCurrentTimeZoneDateTime().dateString();
  if (delta === 1 && !canGoToNextWeek(weekMonday, today)) return;
  const next = addCalendarDays(weekMonday, delta * 7);
  if (!next) return;
  weekMonday = next;
  renderWeek();
  vibrate(10);
}

// ============================================================================
// THEME
// ============================================================================

export function toggleTheme() {
  const newTheme =
    (document.documentElement.dataset.theme || "dark") === "dark"
      ? "light"
      : "dark";
  document.documentElement.dataset.theme = newTheme;
  saveTheme(newTheme);
  updateThemeButton(newTheme);
}

function loadTheme() {
  const theme = loadStoredTheme();
  document.documentElement.dataset.theme = theme;
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️ Svetlá" : "🌙 Tmavá";
}

// ============================================================================
// CLOCK DISPLAY
// ============================================================================
function setDigitValue(el, value) {
  if (!el) return;

  const displayValue = pad(value);

  if ("value" in el) {
    el.value = displayValue;
  } else {
    el.textContent = displayValue;
  }

  el.setAttribute("aria-valuenow", String(value));
}

function updateDisplay() {
  setDigitValue(document.getElementById("hours"), hours);
  setDigitValue(document.getElementById("minutes"), minutes);
}

function updateLiveTime() {
  const el = document.getElementById("liveTime");
  if (el) el.textContent = `${now.hour}:${now.minute}:${now.second}`;

  if (Number.parseInt(now.second) === 0) {
    const dateEl = document.getElementById("liveDate");
    if (dateEl) {
      const d = new Date(
        Number.parseInt(now.year),
        Number.parseInt(now.month) - 1,
        Number.parseInt(now.day),
      );
      dateEl.textContent = d.toLocaleDateString("sk-SK", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
}

// Hodiny a minúty sú nezávislé — žiadne previazanie
export function adjust(type, delta) {
  const elId = type === "hour" ? "hours" : "minutes";
  const el = document.getElementById(elId);
  el.classList.remove("flip");
  el.classList.add("flip");

  if (type === "hour") {
    hours = (hours + delta + 24) % 24;
  } else {
    minutes = (minutes + delta + 60) % 60;
  }
  updateDisplay();
  vibrate(10);
}

export function setNow() {
  hours = Number.parseInt(now.hour);
  minutes = Number.parseInt(now.minute);
  updateDisplay();
  document.getElementById("hours").classList.add("flip");
  document.getElementById("minutes").classList.add("flip");
  vibrate(HAPTIC_DEFAULT);
}

// ============================================================================
// STATE / BUTTON UPDATES
// ============================================================================

function updateStateButton() {
  const cfg = STATE_CONFIG[appState];
  if (!cfg) return;

  const btn = document.getElementById("action-btn");
  btn.textContent = cfg.label;
  btn.className = `btn btn-action action-${appState}`;
  btn.disabled = cfg.disabled || false;

  const rec = loadTodayRecord();
  const hasRecord = !!(
    rec.home_office ||
    rec.arrival ||
    rec.break_start ||
    rec.break_end ||
    rec.break_skipped ||
    rec.departure
  );
  document.getElementById("btn-back").disabled = !hasRecord;
  document.getElementById("btn-skip").disabled = !cfg.showSkip;
  const hoBtn = document.getElementById("btn-ho");
  if (hoBtn) hoBtn.disabled = appState !== "arrival";
}

// ============================================================================
// HANDLERS
// ============================================================================

export function handleActionButtonClick() {
  const cfg = STATE_CONFIG[appState];
  if (!cfg?.next) return;

  const rec = loadTodayRecord();
  const currentMin = hours * 60 + minutes;

  let warning = null;
  const validator = VALIDATORS[appState];
  if (validator) {
    const result = validator(rec, currentMin, mathCfg());
    if (!result.ok) {
      showMessage(result.error, "error");
      return;
    }
    warning = result.warning;
  }

  if (cfg.event) {
    saveTimeRecord(cfg.event);
    const currentTime = `${pad(hours)}:${pad(minutes)}`;
    if (warning) {
      showMessage(warning, "warning");
    } else {
      showMessage(`✅ ${cfg.label} uložený: ${currentTime}`, "success");
    }
    renderWeek();
  }

  appState = cfg.next;
  updateStateButton();
  updateWorkInfo();
}

export function skipBreak() {
  if (appState !== "break_start") return;
  const today = getCurrentTimeZoneDateTime().dateString();
  setTodayField(today, "break_skipped", true);
  appState = "departure";
  renderWeek();
  updateStateButton();
  updateWorkInfo();
  const mins = currentSettings.breakMinutes;
  showMessage(`✅ Prestávka preskočená — počíta sa ${mins} min`, "success");
  vibrate(HAPTIC_DEFAULT);
}

export function applyHomeOffice() {
  if (appState !== "arrival") return;
  const rec = loadTodayRecord();
  if (rec.arrival || rec.home_office) return;
  const today = getCurrentTimeZoneDateTime().dateString();
  saveDayRecord(today, homeOfficeStamp());
  appState = "finished";
  renderWeek();
  updateStateButton();
  updateWorkInfo();
  refreshDataPanel();
  showMessage("✅ HO 08:00–16:30 (8h, prestávka 30 min)", "success");
  vibrate(HAPTIC_DEFAULT);
}

export function handleBackClick() {
  const rec = loadTodayRecord();
  const today = getCurrentTimeZoneDateTime().dateString();

  if (rec.home_office) {
    deleteDayRecord(today);
    appState = "arrival";
    renderWeek();
    updateStateButton();
    updateWorkInfo();
    refreshDataPanel();
    vibrate(HAPTIC_DEFAULT);
    return;
  }

  let toDelete = null;
  if (rec.departure) toDelete = "departure";
  else if (rec.break_skipped) toDelete = "break_skipped";
  else if (rec.break_end) toDelete = "break_end";
  else if (rec.break_start) toDelete = "break_start";
  else if (rec.arrival) toDelete = "arrival";

  if (!toDelete) return;

  deleteTodayEvent(today, toDelete);

  appState = toDelete === "break_skipped" ? "break_start" : toDelete;
  renderWeek();
  updateStateButton();
  updateWorkInfo();
  vibrate(HAPTIC_DEFAULT);
}

// ============================================================================
// HOLD TO REPEAT
// ============================================================================

export function startHold(type, delta) {
  clearTimeout(holdTimeout);
  clearInterval(holdInterval);
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(() => adjust(type, delta), 100);
  }, 500);
}

export function stopHold() {
  clearTimeout(holdTimeout);
  clearInterval(holdInterval);
  holdTimeout = null;
  holdInterval = null;
}

// ============================================================================
// WORK INFO RENDERING
// ============================================================================

function updateWorkInfo() {
  const rec = loadTodayRecord();

  if (!rec.arrival) {
    document.getElementById("liveStats").style.display = "none";
    document.getElementById("departureBlock").style.display = "none";
    document.getElementById("daySummary").style.display = "none";
    return;
  }

  if (rec.departure || rec.home_office) {
    showDaySummary(rec);
    return;
  }

  document.getElementById("liveStats").style.display = "grid";
  document.getElementById("departureBlock").style.display = "block";
  document.getElementById("daySummary").style.display = "none";

  const arrivalMin = parseTimeToMinutes(rec.arrival);
  const nowMin = getNowMin();
  const nowAbsMin = toAbsMin(nowMin, arrivalMin);
  const cfg = mathCfg();
  const departureAbsMin = getPlannedDepartureAbsMin(rec, cfg);
  const workedMinutes = calculateWorkedMinutes(rec, nowMin, cfg);
  const remainingMinutes = departureAbsMin - nowAbsMin;

  const workedEl = document.getElementById("liveWorkedTime");
  workedEl.textContent = `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m`;
  workedEl.className = "stat-value";
  if (workedMinutes >= cfg.workHours * 60) workedEl.classList.add("success");
  else if (workedMinutes >= cfg.workHours * 60 * 0.875)
    workedEl.classList.add("warning");

  const remEl = document.getElementById("liveRemainingTime");
  if (remainingMinutes <= 0) {
    remEl.textContent = "✅ Hotovo!";
    remEl.className = "stat-value success";
  } else {
    remEl.textContent = `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`;
    remEl.className = "stat-value";
    if (remainingMinutes > 240) remEl.classList.add("danger");
    else if (remainingMinutes > 120) remEl.classList.add("warning");
    else remEl.classList.add("success");
  }

  document.getElementById("departureTime").textContent =
    minutesToDisplay(departureAbsMin);
}

function showDaySummary(rec) {
  document.getElementById("liveStats").style.display = "none";
  document.getElementById("departureBlock").style.display = "none";

  const summary = document.getElementById("daySummary");
  if (!summary) return;
  summary.style.display = "block";
  const title = summary.querySelector(".summary-title");
  if (title) {
    title.textContent = rec.home_office ? "📊 Sumár dňa (HO)" : "📊 Sumár dňa";
  }

  const stamp = rec.home_office ? homeOfficeStamp() : rec;
  const arrivalMin = parseTimeToMinutes(stamp.arrival);
  const departureAbsMin = toAbsMin(
    parseTimeToMinutes(stamp.departure),
    arrivalMin,
  );
  const cfg = mathCfg();
  const breakDuration = rec.home_office ? 30 : getBreakDuration(rec, cfg);
  const totalMinutes = rec.home_office
    ? closedPieceWorkedMinutes(rec, cfg)
    : departureAbsMin - arrivalMin - breakDuration;
  const diff = totalMinutes - cfg.workHours * 60;
  const absDiff = Math.abs(diff);

  document.getElementById("summaryArrival").textContent = stamp.arrival;
  document.getElementById("summaryDeparture").textContent = stamp.departure;

  if (stamp.break_start && stamp.break_end) {
    document.getElementById("summaryBreak").textContent =
      `${stamp.break_start} - ${stamp.break_end} (${Math.floor(breakDuration / 60)}h ${breakDuration % 60}m)`;
  } else {
    document.getElementById("summaryBreak").textContent =
      `Skipnutá (${breakDuration} min)`;
  }

  document.getElementById("summaryTotal").textContent =
    `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  const diffEl = document.getElementById("summaryDiff");
  diffEl.textContent = `${diff >= 0 ? "+" : "-"}${Math.floor(absDiff / 60)}h ${absDiff % 60}m`;
  diffEl.parentElement.querySelector("span:last-child").style.color =
    diff >= 0 ? "var(--accent-success)" : "var(--accent-hot)";
}

// ============================================================================
// BOOTSTRAP — called from main.js after DOM ready
// ============================================================================

export function init() {
  loadTheme();

  now = getCurrentTimeZoneDateTime();
  hours = Number.parseInt(now.hour);
  minutes = Number.parseInt(now.minute);

  const today = now.dateString();
  if (loadLastTableDate() !== today) {
    saveLastTableDate(today);
  }

  if (DEV_MODE) {
    const seed = new URLSearchParams(globalThis.location.search).get("seed");
    if (seed) {
      const seededMonday = applyPlaytestSeed(seed);
      if (seededMonday) weekMonday = seededMonday;
      globalThis.history.replaceState({}, "", "./");
    }
  }

  if (!weekMonday) weekMonday = mondayOfWeek(today);
  renderWeek();
  appState = determineAppState();
  updateStateButton();
  updateDisplay();
  updateWorkInfo();
  fillSettingsForm();
  refreshDataPanel();

  setInterval(() => {
    now = getCurrentTimeZoneDateTime();
    updateLiveTime();
    if (Number.parseInt(now.second) % 15 === 0) updateWorkInfo();
  }, 1000);
}

function fillSettingsForm() {
  const hoursEl = document.getElementById("setting-work-hours");
  const breakEl = document.getElementById("setting-break-minutes");
  const earliestEl = document.getElementById("setting-earliest");
  const actualEl = document.getElementById("setting-actual-break");
  if (!hoursEl || !breakEl || !earliestEl || !actualEl) return;
  hoursEl.value = String(currentSettings.workHours);
  breakEl.value = String(currentSettings.breakMinutes);
  earliestEl.value = currentSettings.earliestDeparture;
  actualEl.checked = currentSettings.useActualBreakTime === true;
}

function refreshDataPanel() {
  const el = document.getElementById("data-day-count");
  if (el) el.textContent = String(countRecordDays(loadAllRecords()));
}

export function switchTab(tab) {
  for (const panel of document.querySelectorAll(".tab-panel")) {
    const on = panel.id === `panel-${tab}`;
    panel.classList.toggle("is-active", on);
    panel.hidden = !on;
  }
  for (const btn of document.querySelectorAll(".tab-btn")) {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  }
  if (tab === "settings") fillSettingsForm();
  if (tab === "data") refreshDataPanel();
}

export function handleSaveSettings(event) {
  event.preventDefault();
  const earliestRaw = document.getElementById("setting-earliest")?.value ?? "";
  const earliestMatch = String(earliestRaw).match(/^(\d{2}:\d{2})/);
  currentSettings = saveSettings({
    workHours: document.getElementById("setting-work-hours")?.value,
    breakMinutes: document.getElementById("setting-break-minutes")?.value,
    earliestDeparture: earliestMatch ? earliestMatch[1] : earliestRaw,
    useActualBreakTime: document.getElementById("setting-actual-break")
      ?.checked,
  });
  fillSettingsForm();
  updateWorkInfo();
  renderWeek();
  showMessage("✅ Nastavenia uložené", "success");
}

export function handleExportJson() {
  const records = loadAllRecords();
  const payload = buildExportPayload(records);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timeholder-${getCurrentTimeZoneDateTime().dateString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showMessage("✅ JSON stiahnutý", "success");
}
