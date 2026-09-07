// Testy pre scripts/storage.js — parse a export, žiadny DOM.
import {
  parseRecordsJson,
  countRecordDays,
  buildExportPayload,
} from "../scripts/storage.js";

import { category, test, assertEqual, assertTrue } from "./_framework.js";

category("12. Storage — parse work_records bez pádu");

test("parseRecordsJson({}) → prázdny objekt", () => {
  const r = parseRecordsJson("{}");
  assertEqual(Object.keys(r).length, 0);
});

test("parseRecordsJson neplatný JSON → {}", () => {
  const r = parseRecordsJson("{broken");
  assertEqual(Object.keys(r).length, 0);
});

test("parseRecordsJson null/empty → {}", () => {
  assertEqual(Object.keys(parseRecordsJson(null)).length, 0);
  assertEqual(Object.keys(parseRecordsJson("")).length, 0);
});

test("parseRecordsJson pole → {}", () => {
  assertEqual(Object.keys(parseRecordsJson("[]")).length, 0);
});

test("parseRecordsJson zachová dni", () => {
  const r = parseRecordsJson(
    '{"2026-06-09":{"arrival":"08:00","departure":"16:30"}}',
  );
  assertEqual(r["2026-06-09"].arrival, "08:00");
  assertEqual(r["2026-06-09"].departure, "16:30");
});

test("countRecordDays počíta kľúče", () => {
  assertEqual(countRecordDays({}), 0);
  assertEqual(
    countRecordDays({
      "2026-06-09": { arrival: "08:00" },
      "2026-06-10": { arrival: "07:30" },
    }),
    2,
  );
});

category("13. Storage — export payload (len čítanie records)");

test("buildExportPayload kopíruje records 1:1 a pridá app + exportedAt", () => {
  const records = { "2026-06-09": { arrival: "08:00" } };
  const at = new Date("2026-09-02T10:00:00.000Z");
  const payload = buildExportPayload(records, at);
  assertEqual(payload.app, "TimeHolder");
  assertEqual(payload.exportedAt, at.toISOString());
  assertEqual(payload.records["2026-06-09"].arrival, "08:00");
  assertTrue(payload.settings === undefined);
});

test("buildExportPayload pri prázdnych records ostane prázdne records", () => {
  const payload = buildExportPayload({}, new Date("2026-09-02T10:00:00.000Z"));
  assertEqual(Object.keys(payload.records).length, 0);
});
