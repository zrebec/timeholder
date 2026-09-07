// ============================================================================
// Minimalistický test framework — shared state medzi test súbormi.
// Import this in each *.tests.js; finalSummary() volá tests/run.js.
// ============================================================================

let passed = 0;
let failed = 0;
const failures = [];

export function category(name) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 ${name}`);
  console.log("=".repeat(60));
}

export function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    failures.push({ name, message: error.message });
    failed++;
  }
}

export function assertEqual(actual, expected, message = "") {
  if (actual !== expected) {
    throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
  }
}

export function assertTrue(condition, message = "Expected true") {
  if (!condition) throw new Error(message);
}

export function assertFalse(condition, message = "Expected false") {
  if (condition) throw new Error(message);
}

export function assertNull(value, message = "Expected null") {
  if (value !== null) throw new Error(`${message}, Got: ${value}`);
}

export function finalSummary() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 SUMÁR");
  console.log("=".repeat(60));
  console.log(`\n  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total:  ${passed + failed}`);

  if (failed > 0) {
    console.log("\n❌ NIEKTORÉ TESTY ZLYHALI:");
    for (const f of failures) console.log(`   • ${f.name}: ${f.message}`);
    console.log();
    process.exit(1);
  } else {
    console.log("\n✅ VŠETKY TESTY PREŠLI!\n");
    process.exit(0);
  }
}
