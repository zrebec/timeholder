// DEV-only seed into localStorage. Fixtures live in playtest-weeks.js.
import { loadAllRecords, saveAllRecords } from "./storage.js";
import { SEED_WEEKS, SEED_KEY_ORDER } from "./playtest-weeks.js";

export function applyPlaytestSeed(name) {
  const keys = name === "all" ? SEED_KEY_ORDER : [name];
  if (name !== "all" && !SEED_WEEKS[name]) return null;

  const records = loadAllRecords();
  for (const key of keys) {
    Object.assign(records, SEED_WEEKS[key].records);
  }
  saveAllRecords(records);

  if (name === "all") return SEED_WEEKS["4"].monday;
  return SEED_WEEKS[name].monday;
}
