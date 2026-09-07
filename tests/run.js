// ============================================================================
// Test runner — importuje všetky *.tests.js v poradí, potom vypíše sumár.
// Spustenie: node tests/run.js  (alebo `npm test`)
// ============================================================================

console.log("\n🧪 TimeHolder Test Suite");
console.log("📅 " + new Date().toLocaleString("sk-SK"));

await import("./time-math.tests.js");
await import("./week-scenarios.tests.js");
await import("./validation.tests.js");
await import("./settings.tests.js");
await import("./storage.tests.js");

const { finalSummary } = await import("./_framework.js");
finalSummary();
