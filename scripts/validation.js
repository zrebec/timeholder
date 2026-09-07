// ============================================================================
// Pure validators — žiadny DOM, žiadne side effecty.
// Vracajú { ok: boolean, error?: string, warning?: string }.
// Caller (ui.js) sa stará o zobrazenie správ.
// ============================================================================

import {
  parseTimeToMinutes,
  toAbsMin,
  getPlannedDepartureAbsMin,
  isValidMinuteOfDay,
} from "./time-math.js";

function hasValidArrival(rec) {
  return isValidMinuteOfDay(parseTimeToMinutes(rec.arrival));
}

function invalidTimeError(label) {
  return { ok: false, error: `❌ Neplatný čas: ${label}!` };
}

export function validateBreakStart(rec) {
  if (!rec.arrival) return { ok: false, error: "❌ Najprv zadaj príchod!" };
  if (!hasValidArrival(rec)) return invalidTimeError("príchod");
  return { ok: true };
}

export function validateBreakEnd(rec, currentMin) {
  if (!rec.arrival) return { ok: false, error: "❌ Najprv zadaj príchod!" };
  if (!hasValidArrival(rec)) return invalidTimeError("príchod");
  if (!rec.break_start)
    return { ok: false, error: "❌ Najprv začni prestávku!" };
  if (!isValidMinuteOfDay(currentMin)) return invalidTimeError("aktuálny čas");

  const arrivalMin = parseTimeToMinutes(rec.arrival);
  const breakStartMin = parseTimeToMinutes(rec.break_start);
  if (!isValidMinuteOfDay(breakStartMin))
    return invalidTimeError("začiatok prestávky");

  const breakStartAbsMin = toAbsMin(breakStartMin, arrivalMin);
  const currentAbsMin = toAbsMin(currentMin, arrivalMin);
  if (currentAbsMin < breakStartAbsMin) {
    return {
      ok: false,
      error: "❌ Koniec prestávky nemôže byť pred začiatkom!",
    };
  }
  return { ok: true };
}

export function validateDeparture(rec, currentMin, settings) {
  if (!rec.arrival) return { ok: false, error: "❌ Najprv zadaj príchod!" };
  if (!hasValidArrival(rec)) return invalidTimeError("príchod");
  if (!isValidMinuteOfDay(currentMin)) return invalidTimeError("aktuálny čas");

  if (rec.break_start) {
    const breakStartMin = parseTimeToMinutes(rec.break_start);
    if (!isValidMinuteOfDay(breakStartMin))
      return invalidTimeError("začiatok prestávky");
  }

  if (rec.break_start && !rec.break_end) {
    return { ok: false, error: "❌ Najprv ukonči prestávku alebo ju preskoč!" };
  }

  const arrivalMin = parseTimeToMinutes(rec.arrival);
  const currentAbsMin = toAbsMin(currentMin, arrivalMin);

  if (rec.break_end) {
    const breakEndMin = parseTimeToMinutes(rec.break_end);
    if (!isValidMinuteOfDay(breakEndMin))
      return invalidTimeError("koniec prestávky");

    const breakEndAbsMin = toAbsMin(breakEndMin, arrivalMin);
    if (currentAbsMin < breakEndAbsMin) {
      return {
        ok: false,
        error: "❌ Odchod nemôže byť pred koncom prestávky!",
      };
    }
  }

  const departureAbsMin = getPlannedDepartureAbsMin(rec, settings);
  if (departureAbsMin === null) return invalidTimeError("plánovaný odchod");

  if (currentAbsMin < departureAbsMin) {
    const diff = departureAbsMin - currentAbsMin;
    const diffText =
      Math.floor(diff / 60) > 0
        ? `${Math.floor(diff / 60)}h ${diff % 60}m`
        : `${diff % 60}m`;
    return {
      ok: true,
      warning: `⚠️ POZOR!\nOdchádzaš o ${diffText} skôr!\nDeficit: -${diffText}`,
    };
  }
  return { ok: true };
}
