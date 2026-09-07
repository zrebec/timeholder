// Playtest weeks — pure fixtures (no localStorage). Tests and DEV seed share this.
import { homeOfficeStamp } from "./time-math.js";

function office(arrival, breakStart, breakEnd, departure) {
  return {
    arrival,
    break_start: breakStart,
    break_end: breakEnd,
    departure,
  };
}

const DAY_8H = office("06:30", "11:00", "11:30", "15:00");
const DAY_10H = office("06:00", "12:00", "12:30", "16:30");
const DAY_6H = office("06:00", "10:00", "10:30", "12:30");

export const SEED_WEEKS = {
  week: {
    monday: "2026-08-24",
    records: {
      "2026-08-24": office("06:12", "11:20", "12:05", "15:00"),
      "2026-08-25": homeOfficeStamp(),
      "2026-08-26": office("06:05", "12:00", "12:40", "15:00"),
      "2026-08-27": homeOfficeStamp(),
      "2026-08-28": office("06:17", "12:15", "13:00", "15:00"),
    },
  },
  1: {
    monday: "2026-08-10",
    records: {
      "2026-08-10": { ...DAY_8H },
      "2026-08-11": { ...DAY_8H },
      "2026-08-12": { ...DAY_8H },
      "2026-08-13": { ...DAY_8H },
      "2026-08-14": { ...DAY_10H },
    },
  },
  2: {
    monday: "2026-08-17",
    records: {
      "2026-08-17": { ...DAY_8H },
      "2026-08-18": homeOfficeStamp(),
      "2026-08-19": { ...DAY_8H },
      "2026-08-20": homeOfficeStamp(),
      "2026-08-21": { ...DAY_6H },
    },
  },
  3: {
    monday: "2026-08-03",
    records: {
      "2026-08-03": { ...DAY_8H },
      "2026-08-04": { ...DAY_8H },
      "2026-08-05": { arrival: "06:00", break_start: "10:00" },
      "2026-08-06": { ...DAY_8H },
      "2026-08-07": { ...DAY_8H },
    },
  },
  4: {
    monday: "2026-07-27",
    records: {
      "2026-07-27": { arrival: "06:10" },
      "2026-07-28": { arrival: "06:10" },
      "2026-07-29": { arrival: "06:10" },
      "2026-07-30": { arrival: "06:10" },
      "2026-07-31": { arrival: "06:10" },
    },
  },
};

export const SEED_KEY_ORDER = ["week", "1", "2", "3", "4"];
