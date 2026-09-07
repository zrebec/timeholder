// ============================================================================
// Bootstrap — wires DOM event handlers to UI module after DOM ready.
// All inline onclick="..." attributes were removed from index.html;
// wiring lives here.
// ============================================================================

import {
  DEV_MODE,
  init,
  adjust,
  setNow,
  skipBreak,
  applyHomeOffice,
  handleBackClick,
  handleActionButtonClick,
  toggleTheme,
  startHold,
  stopHold,
  switchTab,
  handleSaveSettings,
  handleExportJson,
  shiftWeek,
} from "./ui.js";

function wireEvents() {
  // Adjust buttons (▲ ▼ on hours/minutes) — click + hold-to-repeat
  for (const btn of document.querySelectorAll(".btn-adjust")) {
    const type = btn.dataset.type;
    const delta = Number.parseInt(btn.dataset.delta, 10);
    if (!type || Number.isNaN(delta)) continue;

    btn.addEventListener("click", () => adjust(type, delta));
    btn.addEventListener("mousedown", () => startHold(type, delta));
    btn.addEventListener("mouseup", stopHold);
    btn.addEventListener("mouseleave", stopHold);
    btn.addEventListener("touchstart", () => startHold(type, delta));
    btn.addEventListener("touchend", stopHold);
    btn.addEventListener("touchcancel", stopHold);
  }

  // Keyboard on digit spinbuttons
  const keyMap = { hours: "hour", minutes: "min" };
  for (const id of Object.keys(keyMap)) {
    document.getElementById(id).addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        adjust(keyMap[id], 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        adjust(keyMap[id], -1);
      }
    });
  }

  // Main action button
  document
    .getElementById("action-btn")
    .addEventListener("click", handleActionButtonClick);

  // Action bar
  document.getElementById("btn-now").addEventListener("click", setNow);
  document.getElementById("btn-skip").addEventListener("click", skipBreak);
  document.getElementById("btn-ho").addEventListener("click", applyHomeOffice);
  document
    .getElementById("btn-back")
    .addEventListener("click", handleBackClick);

  // Theme toggle
  document
    .getElementById("theme-toggle")
    .addEventListener("click", toggleTheme);

  for (const btn of document.querySelectorAll(".tab-btn")) {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  }

  document
    .getElementById("settings-form")
    .addEventListener("submit", handleSaveSettings);

  document
    .getElementById("btn-export")
    .addEventListener("click", handleExportJson);

  document
    .getElementById("week-prev")
    .addEventListener("click", () => shiftWeek(-1));
  document
    .getElementById("week-next")
    .addEventListener("click", () => shiftWeek(1));

  // Prevent zoom on double tap (mobile)
  document.addEventListener("dblclick", (e) => e.preventDefault());
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && !DEV_MODE) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("[SW] Registered", reg))
      .catch((err) => console.error("[SW] Failed", err));
  }
}

function bootstrap() {
  init();
  wireEvents();
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
