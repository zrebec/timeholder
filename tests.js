/**
 * WorkHolder Test Suite
 * 
 * Unit testy pre všetky kalkulačné a validačné funkcie.
 * Spustenie: node test.js
 * 
 * Požiadavky: Node.js 18+
 */

// ============================================================================
// TEST FRAMEWORK (minimalistický, bez závislostí)
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;
let currentCategory = '';

function category(name) {
    currentCategory = name;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${name}`);
    console.log('='.repeat(60));
}

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\n     Expected: ${JSON.stringify(expected)}\n     Got: ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition, message = 'Expected true') {
    if (!condition) {
        throw new Error(message);
    }
}

function assertFalse(condition, message = 'Expected false') {
    if (condition) {
        throw new Error(message);
    }
}

function assertNull(value, message = 'Expected null') {
    if (value !== null) {
        throw new Error(`${message}, Got: ${value}`);
    }
}

// ============================================================================
// KONFIGURÁCIA (kopírovaná z script.js)
// ============================================================================

const WORK_HOURS = 8;
const BREAK_MINUTES = 30;
const EARLIEST_DEPARTURE_TIME = "15:00";
let USE_ACTUAL_BREAK_TIME = true;  // let - budeme meniť v testoch

// ============================================================================
// FUNKCIE NA TESTOVANIE (kopírované z script.js)
// ============================================================================

function pad(n) {
    return n.toString().padStart(2, '0');
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const [h, m] = timeStr.split(':').map(n => Number.parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

function formatMinutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${pad(h)}:${pad(m)}`;
}

function getNowMinutes(now) {
    return Number.parseInt(now.hour, 10) * 60 + Number.parseInt(now.minute, 10);
}

function calculateActualBreakDuration(breakStart, breakEnd) {
    const startMinutes = parseTimeToMinutes(breakStart);
    const endMinutes = parseTimeToMinutes(breakEnd);
    
    if (startMinutes === null || endMinutes === null) {
        return null;
    }
    
    let duration = endMinutes - startMinutes;
    
    if (duration < 0) {
        return 0;
    }
    
    return duration;
}

function getBreakDuration(record, forDeparture = false) {
    if (!record.break_start) {
        return BREAK_MINUTES;
    }
    
    if (forDeparture) {
        return BREAK_MINUTES;
    }
    
    if (!USE_ACTUAL_BREAK_TIME) {
        return BREAK_MINUTES;
    }
    
    if (!record.break_end) {
        return BREAK_MINUTES;
    }
    
    const actual = calculateActualBreakDuration(record.break_start, record.break_end);
    return actual ?? BREAK_MINUTES;
}

function getEffectiveDepartureTime(todayRecord) {
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    const breakToAdd = getBreakDuration(todayRecord, false);
    const calculatedMinutes = arrivalMinutes + WORK_HOURS * 60 + breakToAdd;
    
    const earliestMinutes = parseTimeToMinutes(EARLIEST_DEPARTURE_TIME);
    const effectiveMinutes = Math.max(calculatedMinutes, earliestMinutes);
    
    return {
        calculated: calculatedMinutes,
        effective: effectiveMinutes,
        isRestricted: effectiveMinutes > calculatedMinutes
    };
}

function calculateWorkedMinutes(todayRecord, now) {
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    const nowMinutes = getNowMinutes(now);
    
    let workedMinutes = nowMinutes - arrivalMinutes;
    
    if (workedMinutes < 0) {
        workedMinutes += 24 * 60;
    }
    
    if (!todayRecord.break_start) {
        return workedMinutes;
    }
    
    const breakStartMinutes = parseTimeToMinutes(todayRecord.break_start);
    
    if (nowMinutes < breakStartMinutes) {
        return workedMinutes;
    }
    
    if (!todayRecord.break_end || nowMinutes < parseTimeToMinutes(todayRecord.break_end)) {
        workedMinutes = breakStartMinutes - arrivalMinutes;
        if (workedMinutes < 0) {
            workedMinutes += 24 * 60;
        }
        return workedMinutes;
    }
    
    if (USE_ACTUAL_BREAK_TIME) {
        const breakEndMinutes = parseTimeToMinutes(todayRecord.break_end);
        const beforeBreak = breakStartMinutes - arrivalMinutes;
        const afterBreak = nowMinutes - breakEndMinutes;
        workedMinutes = beforeBreak + afterBreak;
        
        if (workedMinutes < 0) {
            workedMinutes += 24 * 60;
        }
    } else {
        workedMinutes -= BREAK_MINUTES;
    }
    
    return workedMinutes;
}

function calculateRemainingMinutes(todayRecord, now) {
    const nowMinutes = getNowMinutes(now);
    const departure = getEffectiveDepartureTime(todayRecord);
    let remaining = departure.effective - nowMinutes;
    
    if (remaining < -720) {
        remaining += 24 * 60;
    }
    
    return remaining;
}

// Mock pre validácie (bez DOM)
let lastShownMessage = null;
let lastValidationWarning = null;

function showMessage(text, type) {
    lastShownMessage = { text, type };
}

function validateBreakStart(todayRecord, currentMinutes) {
    if (!todayRecord.arrival) {
        showMessage('❌ Najprv zadaj príchod!', 'error');
        return false;
    }
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    if (currentMinutes < arrivalMinutes) {
        showMessage('❌ Prestávka nemôže začať pred príchodom!', 'error');
        return false;
    }
    return true;
}

function validateBreakEnd(todayRecord, currentMinutes) {
    if (!todayRecord.break_start) {
        showMessage('❌ Najprv začni prestávku!', 'error');
        return false;
    }
    const breakStartMinutes = parseTimeToMinutes(todayRecord.break_start);
    if (currentMinutes < breakStartMinutes) {
        showMessage('❌ Koniec prestávky nemôže byť pred začiatkom!', 'error');
        return false;
    }
    return true;
}

function validateDeparture(todayRecord, currentMinutes) {
    if (!todayRecord.arrival) {
        showMessage('❌ Najprv zadaj príchod!', 'error');
        return false;
    }
    
    if (todayRecord.break_start && !todayRecord.break_end) {
        showMessage('❌ Najprv ukonči prestávku alebo ju preskoč!', 'error');
        return false;
    }
    
    if (todayRecord.break_end) {
        const breakEndMinutes = parseTimeToMinutes(todayRecord.break_end);
        if (currentMinutes < breakEndMinutes) {
            showMessage('❌ Odchod nemôže byť pred koncom prestávky!', 'error');
            return false;
        }
    }
    
    const departure = getEffectiveDepartureTime(todayRecord);
    if (currentMinutes < departure.effective) {
        const diffMinutes = departure.effective - currentMinutes;
        const diffH = Math.floor(diffMinutes / 60);
        const diffM = diffMinutes % 60;
        
        let timeText = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
        let warningText = `⚠️ POZOR!\nOdchádzaš o ${timeText} skôr!\nDeficit: -${timeText}`;
        
        lastValidationWarning = warningText;
    } else {
        lastValidationWarning = null;
    }
    
    return true;
}

// ============================================================================
// HELPER FUNKCIE PRE TESTY
// ============================================================================

function createMockNow(hour, minute, second = 0) {
    return {
        year: '2025',
        month: '01',
        day: '15',
        hour: pad(hour),
        minute: pad(minute),
        second: pad(second),
        dateString: function() { return `${this.year}-${this.month}-${this.day}`; }
    };
}

function resetTestState() {
    USE_ACTUAL_BREAK_TIME = true;
    lastShownMessage = null;
    lastValidationWarning = null;
}

// ============================================================================
// TESTY
// ============================================================================

console.log('\n🧪 WorkHolder Test Suite');
console.log('📅 ' + new Date().toLocaleString('sk-SK'));

// ----------------------------------------------------------------------------
// 1. UTILITY FUNKCIE
// ----------------------------------------------------------------------------

category('1. Utility funkcie');

test('pad(5) → "05"', () => {
    assertEqual(pad(5), '05');
});

test('pad(0) → "00"', () => {
    assertEqual(pad(0), '00');
});

test('pad(15) → "15"', () => {
    assertEqual(pad(15), '15');
});

test('pad(59) → "59"', () => {
    assertEqual(pad(59), '59');
});

test('parseTimeToMinutes("08:30") → 510', () => {
    assertEqual(parseTimeToMinutes('08:30'), 510);
});

test('parseTimeToMinutes("00:00") → 0', () => {
    assertEqual(parseTimeToMinutes('00:00'), 0);
});

test('parseTimeToMinutes("23:59") → 1439', () => {
    assertEqual(parseTimeToMinutes('23:59'), 1439);
});

test('parseTimeToMinutes("12:00") → 720', () => {
    assertEqual(parseTimeToMinutes('12:00'), 720);
});

test('parseTimeToMinutes(null) → null', () => {
    assertNull(parseTimeToMinutes(null));
});

test('parseTimeToMinutes("invalid") → null', () => {
    assertNull(parseTimeToMinutes('invalid'));
});

test('parseTimeToMinutes("") → null', () => {
    assertNull(parseTimeToMinutes(''));
});

test('formatMinutesToTime(510) → "08:30"', () => {
    assertEqual(formatMinutesToTime(510), '08:30');
});

test('formatMinutesToTime(0) → "00:00"', () => {
    assertEqual(formatMinutesToTime(0), '00:00');
});

test('formatMinutesToTime(1439) → "23:59"', () => {
    assertEqual(formatMinutesToTime(1439), '23:59');
});

test('formatMinutesToTime(1500) → "01:00" (overflow)', () => {
    assertEqual(formatMinutesToTime(1500), '01:00');
});

test('getNowMinutes({hour:"08", minute:"30"}) → 510', () => {
    const now = createMockNow(8, 30);
    assertEqual(getNowMinutes(now), 510);
});

test('getNowMinutes({hour:"00", minute:"00"}) → 0', () => {
    const now = createMockNow(0, 0);
    assertEqual(getNowMinutes(now), 0);
});

// ----------------------------------------------------------------------------
// 2. BREAK DURATION LOGIKA
// ----------------------------------------------------------------------------

category('2. Break duration logika');

test('getBreakDuration - bez prestávky → BREAK_MINUTES', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    assertEqual(getBreakDuration(record, false), BREAK_MINUTES);
});

test('getBreakDuration - prestávka začala, neukončená → BREAK_MINUTES', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00' };
    assertEqual(getBreakDuration(record, false), BREAK_MINUTES);
});

test('getBreakDuration - 30min prestávka, USE_ACTUAL=true → 30', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    assertEqual(getBreakDuration(record, false), 30);
});

test('getBreakDuration - 45min prestávka, USE_ACTUAL=true → 45', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    assertEqual(getBreakDuration(record, false), 45);
});

test('getBreakDuration - 45min prestávka, USE_ACTUAL=false → 30', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = false;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    assertEqual(getBreakDuration(record, false), BREAK_MINUTES);
});

test('getBreakDuration - 45min prestávka, forDeparture=true → 30', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    assertEqual(getBreakDuration(record, true), BREAK_MINUTES);
});

test('getBreakDuration - 60min prestávka, USE_ACTUAL=true → 60', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '13:00' };
    assertEqual(getBreakDuration(record, false), 60);
});

test('getBreakDuration - 15min prestávka (kratšia ako plán), USE_ACTUAL=true → 15', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:15' };
    assertEqual(getBreakDuration(record, false), 15);
});

// ----------------------------------------------------------------------------
// 3. DEPARTURE TIME
// ----------------------------------------------------------------------------

category('3. Departure time');

test('getEffectiveDepartureTime - príchod 08:00 → odchod 16:30', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.effective), '16:30');
    assertFalse(result.isRestricted);
});

test('getEffectiveDepartureTime - príchod 06:30 → odchod 15:00 (presne)', () => {
    resetTestState();
    const record = { arrival: '06:30' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.calculated), '15:00');
    assertEqual(formatMinutesToTime(result.effective), '15:00');
    assertFalse(result.isRestricted);
});

test('getEffectiveDepartureTime - príchod 05:30 → restricted na 15:00', () => {
    resetTestState();
    const record = { arrival: '05:30' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.calculated), '14:00');
    assertEqual(formatMinutesToTime(result.effective), '15:00');
    assertTrue(result.isRestricted);
});

test('getEffectiveDepartureTime - príchod 09:00 → odchod 17:30', () => {
    resetTestState();
    const record = { arrival: '09:00' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.effective), '17:30');
});

test('getEffectiveDepartureTime - s 45min prestávkou, USE_ACTUAL=true → 16:45', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.effective), '16:45');
});

test('getEffectiveDepartureTime - s 45min prestávkou, USE_ACTUAL=false → 16:30', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = false;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.effective), '16:30');
});

test('getEffectiveDepartureTime - preskočená prestávka → 16:30 (stále +30min)', () => {
    resetTestState();
    const record = { arrival: '08:00' };  // bez break_start = preskočená
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.effective), '16:30');
});

// ----------------------------------------------------------------------------
// 4. WORKED MINUTES
// ----------------------------------------------------------------------------

category('4. Worked minutes');

test('calculateWorkedMinutes - 08:00 až 12:00, bez prestávky → 240min (4h)', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const now = createMockNow(12, 0);
    assertEqual(calculateWorkedMinutes(record, now), 240);
});

test('calculateWorkedMinutes - 08:00 až 16:30, bez prestávky → 510min (8.5h)', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const now = createMockNow(16, 30);
    assertEqual(calculateWorkedMinutes(record, now), 510);
});

test('calculateWorkedMinutes - prestávka ongoing → počíta len čas pred prestávkou', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00' };
    const now = createMockNow(12, 30);  // počas prestávky
    assertEqual(calculateWorkedMinutes(record, now), 240);  // len 4h pred prestávkou
});

test('calculateWorkedMinutes - 30min prestávka ukončená, USE_ACTUAL=true → 8h', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    const now = createMockNow(16, 30);
    assertEqual(calculateWorkedMinutes(record, now), 480);  // 8h
});

test('calculateWorkedMinutes - 45min prestávka, USE_ACTUAL=true → 7h45m', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = true;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    const now = createMockNow(16, 30);
    assertEqual(calculateWorkedMinutes(record, now), 465);  // 7h45m
});

test('calculateWorkedMinutes - 45min prestávka, USE_ACTUAL=false → 8h', () => {
    resetTestState();
    USE_ACTUAL_BREAK_TIME = false;
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:45' };
    const now = createMockNow(16, 30);
    assertEqual(calculateWorkedMinutes(record, now), 480);  // 8h (45min počítané ako 30min)
});

test('calculateWorkedMinutes - čas pred začiatkom prestávky', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    const now = createMockNow(10, 0);  // pred prestávkou
    assertEqual(calculateWorkedMinutes(record, now), 120);  // 2h
});

test('calculateRemainingMinutes - 08:00 príchod, teraz 12:00 → 270min (4.5h)', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const now = createMockNow(12, 0);
    assertEqual(calculateRemainingMinutes(record, now), 270);  // do 16:30
});

test('calculateRemainingMinutes - 08:00 príchod, teraz 16:30 → 0min', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const now = createMockNow(16, 30);
    assertEqual(calculateRemainingMinutes(record, now), 0);
});

test('calculateRemainingMinutes - 08:00 príchod, teraz 17:00 → -30min', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    const now = createMockNow(17, 0);
    assertEqual(calculateRemainingMinutes(record, now), -30);
});

// ----------------------------------------------------------------------------
// 5. VALIDÁCIE
// ----------------------------------------------------------------------------

category('5. Validácie');

test('validateBreakStart - bez príchodu → false + error', () => {
    resetTestState();
    const record = {};
    assertFalse(validateBreakStart(record, 720));
    assertEqual(lastShownMessage.type, 'error');
});

test('validateBreakStart - prestávka pred príchodom → false + error', () => {
    resetTestState();
    const record = { arrival: '09:00' };  // 540min
    assertFalse(validateBreakStart(record, 480));  // 08:00
    assertEqual(lastShownMessage.type, 'error');
});

test('validateBreakStart - platná prestávka → true', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    assertTrue(validateBreakStart(record, 720));  // 12:00
});

test('validateBreakEnd - bez začiatku prestávky → false + error', () => {
    resetTestState();
    const record = { arrival: '08:00' };
    assertFalse(validateBreakEnd(record, 750));
    assertEqual(lastShownMessage.type, 'error');
});

test('validateBreakEnd - koniec pred začiatkom → false + error', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00' };
    assertFalse(validateBreakEnd(record, 700));  // 11:40
    assertEqual(lastShownMessage.type, 'error');
});

test('validateBreakEnd - platný koniec → true', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00' };
    assertTrue(validateBreakEnd(record, 750));  // 12:30
});

test('validateDeparture - bez príchodu → false + error', () => {
    resetTestState();
    const record = {};
    assertFalse(validateDeparture(record, 990));
    assertEqual(lastShownMessage.type, 'error');
});

test('validateDeparture - prestávka neukončená → false + error', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00' };
    assertFalse(validateDeparture(record, 990));
    assertEqual(lastShownMessage.type, 'error');
});

test('validateDeparture - odchod pred koncom prestávky → false + error', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    assertFalse(validateDeparture(record, 720));  // 12:00
    assertEqual(lastShownMessage.type, 'error');
});

test('validateDeparture - platný odchod načas → true, bez warningu', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    assertTrue(validateDeparture(record, 990));  // 16:30
    assertNull(lastValidationWarning);
});

test('validateDeparture - skorý odchod → true + warning', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    assertTrue(validateDeparture(record, 900));  // 15:00
    assertTrue(lastValidationWarning !== null);
    assertTrue(lastValidationWarning.includes('1h 30m'));
});

test('validateDeparture - skorý odchod o 30min → true + warning', () => {
    resetTestState();
    const record = { arrival: '08:00', break_start: '12:00', break_end: '12:30' };
    assertTrue(validateDeparture(record, 960));  // 16:00
    assertTrue(lastValidationWarning !== null);
    assertTrue(lastValidationWarning.includes('30m'));
});

test('validateDeparture - preskočená prestávka, platný odchod → true', () => {
    resetTestState();
    const record = { arrival: '08:00' };  // bez prestávky
    assertTrue(validateDeparture(record, 990));  // 16:30
    assertNull(lastValidationWarning);
});

// ----------------------------------------------------------------------------
// 6. EDGE CASES
// ----------------------------------------------------------------------------

category('6. Edge cases');

test('calculateWorkedMinutes - midnight crossing (príchod 22:00, teraz 02:00)', () => {
    resetTestState();
    const record = { arrival: '22:00' };
    const now = createMockNow(2, 0);
    assertEqual(calculateWorkedMinutes(record, now), 240);  // 4h
});

test('calculateWorkedMinutes - midnight crossing (príchod 23:00, teraz 07:00)', () => {
    resetTestState();
    const record = { arrival: '23:00' };
    const now = createMockNow(7, 0);
    assertEqual(calculateWorkedMinutes(record, now), 480);  // 8h
});

test('calculateActualBreakDuration - null inputs', () => {
    assertNull(calculateActualBreakDuration(null, '12:30'));
    assertNull(calculateActualBreakDuration('12:00', null));
    assertNull(calculateActualBreakDuration(null, null));
});

test('calculateActualBreakDuration - invalid inputs', () => {
    assertNull(calculateActualBreakDuration('invalid', '12:30'));
    assertNull(calculateActualBreakDuration('12:00', 'invalid'));
});

test('calculateActualBreakDuration - break_end pred break_start → 0', () => {
    assertEqual(calculateActualBreakDuration('12:30', '12:00'), 0);
});

test('getBreakDuration - prázdny record → BREAK_MINUTES', () => {
    resetTestState();
    const record = {};
    assertEqual(getBreakDuration(record, false), BREAK_MINUTES);
});

test('parseTimeToMinutes("abc") → null', () => {
    assertNull(parseTimeToMinutes('abc'));
});

test('parseTimeToMinutes(":30") → null', () => {
    assertNull(parseTimeToMinutes(':30'));
});

// POZNÁMKA: parseTimeToMinutes('12') vráti NaN, nie null
// Toto je známe správanie - funkcia očakáva formát "HH:MM"

test('príchod presne o polnoci (00:00)', () => {
    resetTestState();
    const record = { arrival: '00:00' };
    const result = getEffectiveDepartureTime(record);
    assertEqual(formatMinutesToTime(result.calculated), '08:30');
    assertEqual(formatMinutesToTime(result.effective), '15:00');  // restricted
    assertTrue(result.isRestricted);
});

test('dlhý pracovný deň - príchod 07:00, teraz 20:00', () => {
    resetTestState();
    const record = { arrival: '07:00', break_start: '12:00', break_end: '12:30' };
    const now = createMockNow(20, 0);
    assertEqual(calculateWorkedMinutes(record, now), 750);  // 12.5h
});

// ============================================================================
// SUMÁR
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log('📊 SUMÁR');
console.log('='.repeat(60));
console.log(`\n  ✅ Passed: ${testsPassed}`);
console.log(`  ❌ Failed: ${testsFailed}`);
console.log(`  📈 Total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
    console.log('\n❌ NIEKTORÉ TESTY ZLYHALI!\n');
    process.exit(1);
} else {
    console.log('\n✅ VŠETKY TESTY PREŠLI!\n');
    process.exit(0);
}