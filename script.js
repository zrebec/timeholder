// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const DEV_MODE = self.location.hostname.includes('127.0.0.1') || self.location.hostname.includes('localhost') 
const WORK_HOURS = 8;
const BREAK_MINUTES = 30;
const EARLIEST_DEPARTURE_TIME = "15:00";
const USE_ACTUAL_BREAK_TIME = false;

// State transitions mapping for cleaner code
const STATE_CONFIG = {
    arrival: { 
        next: 'break_start', 
        event: 'arrival', 
        label: '➡️ Príchod',
        showBack: false,
        showSkip: false
    },
    break_start: { 
        next: 'break_end', 
        event: 'break_start', 
        label: '▶️ Prestávka',
        showBack: true,
        showSkip: true
    },
    break_end: { 
        next: 'departure', 
        event: 'break_end', 
        label: '⏹️ Koniec prestávky',
        showBack: true,
        showSkip: false
    },
    departure: { 
        next: 'finished', 
        event: 'departure', 
        label: '⬅️ Odchod',
        showBack: true,
        showSkip: false
    },
    finished: { 
        next: null, 
        event: null, 
        label: '🥳 Deň ukončený',
        showBack: true,
        showSkip: false,
        disabled: true
    }
};

/**
 * Pre-computed lookup table mapping event types to their display labels.
 * Created once at load time from STATE_CONFIG to avoid rebuilding on every table render.
 * Example: { 'arrival': '➡️ Príchod', 'break_start': '▶️ Prestávka', ... }
 */
const EVENT_LABEL_LOOKUP = Object.fromEntries(
    Object.entries(STATE_CONFIG).map(([key, config]) => [config.event, config.label])
);

/**
 * Validation functions for each state transition.
 * Maps state names to their validator functions that check if the transition is allowed.
 * Each validator receives (todayRecord, currentMinutes) and returns boolean.
 * Returns true if valid, false if validation failed (error message shown to user).
 */
const VALIDATORS = {
    'break_start': validateBreakStart,
    'break_end': validateBreakEnd,
    'departure': validateDeparture
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let hours = 0;
let minutes = 0;
let holdInterval = null;
let holdTimeout = null;
let appState = 'arrival';
let now = null;
let lastValidationWarning = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current date and time in Bratislava timezone
 * @returns {Object} Object with date/time parts and dateString() method
 */
function getCurrentTimeZoneDateTime() {
    const formatter = new Intl.DateTimeFormat('sk-SK', {
        timeZone: 'Europe/Bratislava',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(new Date());
    return {
        year: parts.find(p => p.type === 'year').value,
        month: parts.find(p => p.type === 'month').value,
        day: parts.find(p => p.type === 'day').value,
        hour: parts.find(p => p.type === 'hour').value,
        minute: parts.find(p => p.type === 'minute').value,
        second: parts.find(p => p.type === 'second').value,
        dateString: function() { return `${this.year}-${this.month}-${this.day}`; }
    };
}

/**
 * Format minutes to HH:MM string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time "HH:MM"
 */
function formatMinutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${pad(h)}:${pad(m)}`;
}

/**
 * Pad number with leading zero if needed
 * @param {number} n - Number to pad
 * @returns {string} Padded string (e.g., "09")
 */
function pad(n) {
    return n.toString().padStart(2, '0');
}

/**
 * Convert time object to total minutes since midnight.
 * @param {Object} now - Time object from getCurrentTimeZoneDateTime()
 * @returns {number} Minutes since midnight (0-1439)
 */
function getNowMinutes(now) {
    return Number.parseInt(now.hour, 10) * 60 + Number.parseInt(now.minute, 10);
}

/**
 * Parse time string to minutes
 * @param {string} timeStr - Time in format "HH:MM"
 * @returns {number|null} - Total minutes, or null if invalid
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const [h, m] = timeStr.split(':').map(n => Number.parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

/**
 * Calculate actual break duration in minutes
 * @param {string} breakStart - Break start time "HH:MM"
 * @param {string} breakEnd - Break end time "HH:MM"
 * @returns {number|null} Duration in minutes or null if invalid
 */
function calculateActualBreakDuration(breakStart, breakEnd) {
    const startMinutes = parseTimeToMinutes(breakStart);
    const endMinutes = parseTimeToMinutes(breakEnd);
    
    if (startMinutes === null || endMinutes === null) {
        return null;
    }
    
    let duration = endMinutes - startMinutes;
    
    // If negative, it means break ended before it started (user error)
    if (duration < 0) {
        return 0;
    }
    
    return duration;
}

/**
 * Get break duration based on settings and context
 * @param {Object} record - Work record
 * @param {boolean} forDeparture - If true, always return planned break for departure calc
 * @returns {number} Break duration in minutes
 */
function getBreakDuration(record, forDeparture = false) {
    if(DEV_MODE) console.log('[BREAK_DURATION] Called with forDeparture:', forDeparture, 'break_start:', record.break_start, 'break_end:', record.break_end);
    
    // If no break started, ALWAYS return BREAK_MINUTES for departure calc
    if (!record.break_start) {
        return BREAK_MINUTES;
    }
    
    // For departure time: ALWAYS use planned break (30 min)
    if (forDeparture) {
        return BREAK_MINUTES;
    }
    
    // For worked time calculation:
    // If USE_ACTUAL_BREAK_TIME is false, always return planned break
    if (!USE_ACTUAL_BREAK_TIME) {
        return BREAK_MINUTES;
    }
    
    // If break not ended yet, return planned break
    if (!record.break_end) {
        return BREAK_MINUTES;
    }
    
    // Return actual break duration
    const actual = calculateActualBreakDuration(record.break_start, record.break_end);
    return actual ?? BREAK_MINUTES;
}

/**
 * Clear all dynamic rows from table (keep header)
 */
function clearEventTable() {
    const table = document.getElementsByClassName('info-table')[0];
    if (!table) return;
    
    const rowCount = table.rows.length;
    
    // Delete all rows except header (row 0)
    for (let i = rowCount - 1; i > 0; i--) {
        table.deleteRow(i);
    }
    
    if(DEV_MODE) console.log('[TABLE] Cleared all event rows');
}

/**
 * Rebuild table from today's saved records
 */
function rebuildTableFromRecords() {
    const todayRecord = loadTodayRecord();
    const eventOrder = ['arrival', 'break_start', 'break_end', 'departure'];
    
    for (const eventType of eventOrder) {
        if (todayRecord[eventType]) {
            const label = EVENT_LABEL_LOOKUP[eventType];
            if (label) {
                addEventToTable(label, todayRecord[eventType]);
            }
        }
    }
    
    if(DEV_MODE) console.log('[TABLE] Rebuilt from records');
}

/**
 * This add a row into the summary table
 */
function addEventToTable(label, timestamp) {
    const table = document.getElementsByClassName('info-table')[0];
    let row = table.insertRow();
    let columnEvent = row.insertCell(0);
    let columnTimestamp = row.insertCell(1);
    columnEvent.textContent = label;
    
    // Handle both string and object
    if (typeof timestamp === 'string') {
        columnTimestamp.textContent = timestamp;
    } else {
        columnTimestamp.textContent = `${pad(Number.parseInt(timestamp.hour))}:${pad(Number.parseInt(timestamp.minute))}`;
    }
}

function setNow() {
    hours = Number.parseInt(now.hour);
    minutes = Number.parseInt(now.minute);
    updateDisplay();

    document.getElementById('hours').classList.add('flip');
    document.getElementById('minutes').classList.add('flip');
}

/**
 * Show message to user
 * @param {string} text - Message text
 * @param {string} type - 'success', 'error', 'warning'
 */
function showMessage(text, type = 'success') {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    
    if (!messageBox || !messageText) return;
    
    messageText.textContent = text;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
    
    // Auto-hide based on type
    const delays = { success: 2000, error: 4000, warning: 8000 };
    const delay = delays[type] || 3000;
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, delay);
}

/**
 * Get effective departure time (calculated vs. earliest allowed)
 * @param {Object} todayRecord - Today's work record
 * @returns {Object} { calculated: "14:42", effective: "15:00", isRestricted: true }
 */
function getEffectiveDepartureTime(todayRecord) {
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    const breakToAdd = getBreakDuration(todayRecord, false);  // ← Použiť existujúcu funkciu!
    const calculatedMinutes = arrivalMinutes + WORK_HOURS * 60 + breakToAdd;
    
    const earliestMinutes = parseTimeToMinutes(EARLIEST_DEPARTURE_TIME);
    const effectiveMinutes = Math.max(calculatedMinutes, earliestMinutes);
    
    return {
        calculated: calculatedMinutes,
        effective: effectiveMinutes,
        isRestricted: effectiveMinutes > calculatedMinutes
    };
}

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    updateThemeButton(newTheme);
}

/**
 * Load saved theme from localStorage
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if(DEV_MODE) console.log('[THEME]: ' + savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    updateThemeButton(savedTheme);
}

/**
 * Update theme toggle button text
 * @param {string} theme - Current theme ('dark' or 'light')
 */
function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️ Svetlá' : '🌙 Tmavá';
    }
}

// ============================================================================
// DATA PERSISTENCE (localStorage)
// ============================================================================

/**
 * Save time record for specific event type
 * @param {string} eventType - Type of event (arrival, break_start, break_end, departure)
 */
function saveTimeRecord(eventType, timeValue = null) {
    const time = timeValue || `${pad(hours)}:${pad(minutes)}`;
    
    const records = JSON.parse(localStorage.getItem('work_records') || '{}');
    const today = getCurrentTimeZoneDateTime().dateString();
    
    if (!records[today]) {
        records[today] = {};
    }
    
    records[today][eventType] = time;
    
    localStorage.setItem('work_records', JSON.stringify(records));
    if(DEV_MODE) console.log(`[SAVE] ${eventType}: ${time}`);
}

/**
 * Load today's work records
 * @returns {Object} Today's records or empty object
 */
function loadTodayRecord() {
    const today = getCurrentTimeZoneDateTime().dateString();
    const records = JSON.parse(localStorage.getItem('work_records') || '{}');
    return records[today] || {};
}

/**
 * Determine current app state based on saved records
 * @returns {string} Current state (arrival, break_start, break_end, departure, finished)
 */
function determineAppState() {
    const todayRecord = loadTodayRecord();
    
    if (!todayRecord.arrival) return 'arrival';
    if (!todayRecord.break_start) return 'break_start';
    if (!todayRecord.break_end) return 'break_end';
    if (!todayRecord.departure) return 'departure';
    return 'finished';
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Skip break - move directly from break_start to departure state
 * Does NOT save break_start or break_end records
 */
function skipBreak() {
    appState = 'departure';
    updateStateButton();
    updateWorkInfo();
    if(DEV_MODE) console.log('[SKIP] Break skipped - no records saved');
}

/**
 * Update state button and action buttons visibility
 */
function updateStateButton() {
    const config = STATE_CONFIG[appState];
    if (!config) return;
    
    const btn = document.getElementById('action-btn');
    const backBtn = document.getElementById('btn-back');
    const skipBtn = document.getElementById('btn-skip');
    
    // Update main button
    btn.textContent = config.label.toString();
    btn.className = `btn btn-action action-${appState}`;
    btn.disabled = config.disabled || false;
    

    const todayRecord = loadTodayRecord();
    const hasAnyRecord = todayRecord.arrival || todayRecord.break_start || todayRecord.break_end || todayRecord.departure;
    
    backBtn.disabled = !hasAnyRecord;
    skipBtn.disabled = !config.showSkip;
}

/**
 * Validate break start time
 * @returns {boolean} true if valid, false if error shown
 */
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

/**
 * Validate break end time
 * @returns {boolean} true if valid, false if error shown
 */
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

/**
 * Validate departure time
 * @param {Object} todayRecord - Today's work record
 * @param {number} currentMinutes - Current clock time in minutes
 * @returns {boolean} true if valid, false if error shown
 */
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

        lastValidationWarning = warningText;  // Ulož warning namiesto zobrazenia
    } else {
        lastValidationWarning = null;
    }
    
    return true;
}

/**
 * Handle main action button click - save record and advance to next action
 */
function handleActionButtonClick() {
    const config = STATE_CONFIG[appState];
    if (!config?.next) return;
    
    const todayRecord = loadTodayRecord();
    const currentTime = `${pad(hours)}:${pad(minutes)}`;
    const currentMinutes = hours * 60 + minutes;
    
    const validator = VALIDATORS[appState];
    if (validator && !validator(todayRecord, currentMinutes)) {
        return; // Validation failed
    }
    
    // Všetko OK - ulož
    if (config.event) {
        saveTimeRecord(config.event);
        
        // Show warning if early departure, otherwise success
        if (lastValidationWarning) {
            showMessage(lastValidationWarning, 'warning');
            lastValidationWarning = null;
        } else {
            showMessage(`✅ ${config.label} uložený: ${currentTime}`, 'success');
        }
        
        clearEventTable();
        rebuildTableFromRecords();
    }
    
    appState = config.next;
    updateStateButton();
    updateWorkInfo();
}

/**
 * Handle back button click - delete last record and go back one state
 */
function handleBackClick() {
    const todayRecord = loadTodayRecord();
    const today = getCurrentTimeZoneDateTime().dateString();
    let records = JSON.parse(localStorage.getItem('work_records') || '{}');
    
    let eventToDelete = null;
    let previousState = null;
    
    // Find the LAST event in order: departure > break_end > break_start > arrival
    if (todayRecord.departure) {
        eventToDelete = 'departure';
        previousState = 'departure';
    } 
    else if (todayRecord.break_end) {
        eventToDelete = 'break_end';
        previousState = 'break_end';
    } 
    else if (todayRecord.break_start) {
        eventToDelete = 'break_start';
        previousState = 'break_start';
    } 
    else if (todayRecord.arrival) {
        eventToDelete = 'arrival';
        previousState = 'arrival';
    }
    
    // Delete record from localStorage
    if (eventToDelete && records[today]) {
        delete records[today][eventToDelete];
        localStorage.setItem('work_records', JSON.stringify(records));
        if(DEV_MODE) console.log(`[BACK] Deleted ${eventToDelete} from storage`);
    }
    
    // Update app state
    if (previousState) {
        appState = previousState;
        
        // CRITICAL: Rebuild table after deletion
        clearEventTable();
        rebuildTableFromRecords();
        
        updateStateButton();
        updateWorkInfo();
        if(DEV_MODE) console.log(`[BACK] Moved to state: ${previousState}`);
    }
}

// ============================================================================
// CLOCK DISPLAY & ADJUSTMENT
// ============================================================================

/**
 * Update clock display (hours and minutes digits)
 */
function updateDisplay() {
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');

    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
}

/**
 * Update live time display (called every second)
 */
function updateLiveTime() {
    // Update time
    const liveTimeEl = document.getElementById('liveTime');
    if (liveTimeEl) {
        liveTimeEl.textContent = `${now.hour}:${now.minute}:${now.second}`;
    }
    
    // Update date (only once per minute to save CPU)
    if (Number.parseInt(now.second) === 0) {
        const liveDateEl = document.getElementById('liveDate');
        if (liveDateEl) {
            const dateObj = new Date(Number.parseInt(now.year), Number.parseInt(now.month) - 1, Number.parseInt(now.day));
            liveDateEl.textContent = dateObj.toLocaleDateString('sk-SK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    }
}

/**
 * Adjust hours or minutes by delta
 * @param {string} type - 'hour' or 'min'
 * @param {number} delta - Amount to adjust (+1 or -1)
 */
function adjust(type, delta) {
    const el = document.getElementById(type === 'hour' ? 'hours' : 'minutes');
    
    // Calculate new value FIRST (before applying)
    let newHours = hours;
    let newMinutes = minutes;
    
    if (type === 'hour') {
        newHours = (hours + delta + 24) % 24;
    } else {
        newMinutes = (minutes + delta + 60) % 60;
        // Handle hour wrap when minutes go from 59->00 or 00->59
        if (delta === 1 && minutes === 59) {
            newHours = (hours + 1) % 24;
        } else if (delta === -1 && minutes === 0) {
            newHours = (hours - 1 + 24) % 24;
        }
    }
    
    // Animation effect
    el.classList.remove('flip');
    el.classList.add('flip');

    // Apply changes
    hours = newHours;
    minutes = newMinutes;
    
    updateDisplay();
}

// ============================================================================
// WORK INFO CALCULATIONS & DISPLAY
// ============================================================================

/**
 * Update work info table (worked time, remaining time, departure time)
 * This is the main calculation function that updates all statistics
 */
function calculateWorkedMinutes(todayRecord, now) {
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    const nowMinutes = getNowMinutes(now);
    
    let workedMinutes = nowMinutes - arrivalMinutes;
    
    // Handle midnight crossing
    if (workedMinutes < 0) {
        workedMinutes += 24 * 60;
    }
    
    // No break - return early
    if (!todayRecord.break_start) {
        return workedMinutes;
    }
    
    const breakStartMinutes = parseTimeToMinutes(todayRecord.break_start);
    
    // Break hasn't started yet (planned for future)
    if (nowMinutes < breakStartMinutes) {
        return workedMinutes;  // Don't subtract anything
    }
    
    // Break is ongoing
    if (!todayRecord.break_end || nowMinutes < parseTimeToMinutes(todayRecord.break_end)) {
        workedMinutes = breakStartMinutes - arrivalMinutes;
        if (workedMinutes < 0) {
            workedMinutes += 24 * 60;
        }
        return workedMinutes;
    }
    
    // Break is finished - use actual or planned duration
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

/**
 * Display worked time in UI with color coding
 * @param {number} workedMinutes - Minutes worked so far
 */
function displayWorkedTime(workedMinutes) {
    const workedHours = Math.floor(workedMinutes / 60);
    const workedMins = workedMinutes % 60;
    const liveWorkedTimeEl = document.getElementById('liveWorkedTime');
    
    if (liveWorkedTimeEl) {
        liveWorkedTimeEl.textContent = `${workedHours}h ${workedMins}m`;
        
        // Color code based on progress
        liveWorkedTimeEl.className = 'stat-value';
        if (workedMinutes >= (WORK_HOURS * 60)) {
            liveWorkedTimeEl.classList.add('success');
        } else if (workedMinutes >= (WORK_HOURS * 60 * 0.875)) {
            liveWorkedTimeEl.classList.add('warning');
        }
    }
}

/**
 * Hide work statistics UI elements
 */
function hideWorkInfo() {
    const liveStats = document.getElementById('liveStats');
    const departureBlock = document.getElementById('departureBlock');
    
    if (liveStats) liveStats.style.display = 'none';
    if (departureBlock) departureBlock.style.display = 'none';
}

/**
 * Show work statistics UI elements
 */
function showWorkInfo() {
    const liveStats = document.getElementById('liveStats');
    const departureBlock = document.getElementById('departureBlock');
    
    if (liveStats) liveStats.style.display = 'grid';
    if (departureBlock) departureBlock.style.display = 'block';
}

/**
 * Calculate remaining minutes until departure
 * @param {Object} todayRecord - Today's work record
 * @param {Object} now - Current time
 * @returns {number} Remaining minutes (can be negative if late)
 */
function calculateRemainingMinutes(todayRecord, now) {
    const nowMinutes = getNowMinutes(now);
    
    const departure = getEffectiveDepartureTime(todayRecord);  // ← Použiť!
    let remaining = departure.effective - nowMinutes;
    
    if (remaining < -720) {
        remaining += 24 * 60;
    }
    
    return remaining;
}

/**
 * Display remaining time in UI with color coding
 * @param {number} remainingMinutes - Minutes remaining (can be negative)
 */
function displayRemainingTime(remainingMinutes) {
    const liveRemainingTimeEl = document.getElementById('liveRemainingTime');
    
    if (!liveRemainingTimeEl) return;
    
    if (remainingMinutes <= 0) {
        liveRemainingTimeEl.textContent = '✅ Hotovo!';
        liveRemainingTimeEl.className = 'stat-value success';
    } else {
        const remH = Math.floor(remainingMinutes / 60);
        const remM = remainingMinutes % 60;
        liveRemainingTimeEl.textContent = `${remH}h ${remM}m`;
        liveRemainingTimeEl.className = 'stat-value';
        
        // Color code: red if >4h left, yellow if 2-4h, green if <2h
        if (remainingMinutes > 240) {
            liveRemainingTimeEl.classList.add('danger');
        } else if (remainingMinutes > 120) {
            liveRemainingTimeEl.classList.add('warning');
        } else {
            liveRemainingTimeEl.classList.add('success');
        }
    }
}

/**
 * Display departure time in UI
 * @param {Object} todayRecord - Today's work record
 */
function displayDepartureTime(todayRecord) {
    const departureTimeEl = document.getElementById('departureTime');
    if (!departureTimeEl) return;
    
    const departure = getEffectiveDepartureTime(todayRecord);  // ← Použiť!
    const depH = Math.floor(departure.effective / 60) % 24;
    const depM = departure.effective % 60;
    
    departureTimeEl.textContent = `${pad(depH)}:${pad(depM)}`;
    
    if (departure.isRestricted) {
        /** 
         * if you want put some customCSSClass for departureTimeEl, do it here
         *  e.g. if you want hightlight that earliest departure is later then 
         *  calculated time by work hours and break **/
        const calcH = Math.floor(departure.calculated / 60) % 24;
        const calcM = departure.calculated % 60;
        departureTimeEl.title = `Vypočítaný: ${pad(calcH)}:${pad(calcM)}, Najskôr: ${EARLIEST_DEPARTURE_TIME}`;
    } else {
        departureTimeEl.style.color = '';
        departureTimeEl.title = '';
    }
}

/**
 * Update work info (live stats cards and departure time)
 * This is the main calculation function that updates all statistics
 */
function updateWorkInfo() {
    const todayRecord = loadTodayRecord();
    
    // Hide if no arrival
    if (!todayRecord.arrival) {
        hideWorkInfo();
        return;
    }
    
    showWorkInfo();

    // Ak je deň ukončený (má departure) → zobraz sumár
    if (todayRecord.departure) {
        showDaySummary(todayRecord);
        return;
    }
    
    const workedMinutes = calculateWorkedMinutes(todayRecord, now);
    const remainingMinutes = calculateRemainingMinutes(todayRecord, now);
    
    displayWorkedTime(workedMinutes);
    displayRemainingTime(remainingMinutes);
    displayDepartureTime(todayRecord);
}

function showDaySummary(todayRecord) {
    // Skry live stats
    const liveStats = document.getElementById('liveStats');
    if (liveStats) liveStats.style.display = 'none';
    
    // Zobraz sumár
    const daySummary = document.getElementById('daySummary');
    if (!daySummary) return;
    daySummary.style.display = 'block';
    
    // Vypočítaj celkový čas
    const arrivalMinutes = parseTimeToMinutes(todayRecord.arrival);
    const departureMinutes = parseTimeToMinutes(todayRecord.departure);
    const breakDuration = getBreakDuration(todayRecord, false); // Reálna prestávka
    
    const totalMinutes = departureMinutes - arrivalMinutes - breakDuration;
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    
    // Vypočítaj deficit/prebytok
    const required = WORK_HOURS * 60;
    const diff = totalMinutes - required;
    const diffH = Math.floor(Math.abs(diff) / 60);
    const diffM = Math.abs(diff) % 60;
    const diffSign = diff >= 0 ? '+' : '-';
    
    // Naplň sumár
    document.getElementById('summaryArrival').textContent = todayRecord.arrival;
    document.getElementById('summaryDeparture').textContent = todayRecord.departure;
    
    if (todayRecord.break_start && todayRecord.break_end) {
        const breakH = Math.floor(breakDuration / 60);
        const breakM = breakDuration % 60;
        document.getElementById('summaryBreak').textContent = 
            `${todayRecord.break_start} - ${todayRecord.break_end} (${breakH}h ${breakM}m)`;
    } else {
        document.getElementById('summaryBreak').textContent = 'Skipnutá';
    }
    
    document.getElementById('summaryTotal').textContent = `${totalH}h ${totalM}m`;
    document.getElementById('summaryDiff').textContent = `${diffSign}${diffH}h ${diffM}m`;
    
    // Farba deficitu
    const diffEl = document.getElementById('summaryDiff').parentElement;
    if (diff >= 0) {
        diffEl.querySelector('span:last-child').style.color = 'var(--accent-success)';
    } else {
        diffEl.querySelector('span:last-child').style.color = 'var(--accent-hot)';
    }
}

// ============================================================================
// BUTTON HOLD TO REPEAT FUNCTIONALITY
// ============================================================================

/**
 * Start hold timer for rapid adjustment
 * @param {Event} e - Mouse/touch event
 */
function startHold(e) {
    const btn = e.currentTarget;
    const type = btn.dataset.type;
    const delta = Number.parseInt(btn.dataset.delta, 10);
    
    if (!type || Number.isNaN(delta)) {
        console.error('[HOLD] Invalid button data attributes');
        return;
    }
    
    const initialDelay = 500;
    const repeatDelay = 100;
    
    // Clear any existing timers FIRST
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    
    // Start new hold sequence
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
            adjust(type, delta);
        }, repeatDelay);
    }, initialDelay);
}

/**
 * Stop hold timer
 */
function stopHold() {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize application on page load
 */
function init() {
    if(DEV_MODE) console.time('init');
    if(DEV_MODE) console.log('[INIT] Initializing WorkHolder app...');
    
    // Load theme
    loadTheme();
    
    // Initialize clock with current time
    now = getCurrentTimeZoneDateTime();
    hours = Number.parseInt(now.hour);
    minutes = Number.parseInt(now.minute);

    // Clear table on new day
    const lastDate = localStorage.getItem('last_table_date');
    const today = now.dateString();
    if (lastDate !== today) {
        clearEventTable();
        localStorage.setItem('last_table_date', today);
    }
    
    // Rebuild table from today's records
    rebuildTableFromRecords();
    
    // Determine current state from saved records
    appState = determineAppState();
    
    // Update UI
    updateStateButton();
    updateDisplay();
    updateWorkInfo();
    
    // Start live clock update
    setInterval(() => {
        now = getCurrentTimeZoneDateTime(); 
        let s = Number.parseInt(now.second);        
        updateLiveTime();
        if (s % 15 === 0) { 
            if(DEV_MODE) console.log('[Update]: updateWorkInfo();', s);  // ← PRIDAJ
            updateWorkInfo();
        }
    }, 1000);
    
    // Setup hold-to-repeat for adjustment buttons
    for (const btn of document.querySelectorAll('.btn-adjust')) {
        btn.addEventListener('mousedown', startHold);
        btn.addEventListener('mouseup', stopHold);
        btn.addEventListener('mouseleave', stopHold);
        btn.addEventListener('touchstart', startHold);
        btn.addEventListener('touchend', stopHold);
    }
    
    // Prevent zoom on double tap (mobile)
    document.addEventListener('dblclick', e => e.preventDefault());
    
    // Register service worker (production only)
    if ('serviceWorker' in navigator && !DEV_MODE) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[SW] Service worker registered.', reg))
            .catch(err => console.error('[SW] Service worker registration failed:', err));
    }
    
    if(DEV_MODE) console.log('[INIT] Initialization complete');
    if(DEV_MODE) console.timeEnd('init');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}