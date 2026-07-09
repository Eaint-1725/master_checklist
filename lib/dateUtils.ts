import type { DateParseResult } from "./types";

// All date math is done against UTC-midnight Date objects (never local time)
// so that day-of-month arithmetic can never shift across a DST boundary.

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export interface Ymd {
  year: number;
  month: number; // 1-12
  day: number;
}

function isValidCalendarDate({ year, month, day }: Ymd): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function ymdToIso({ year, month, day }: Ymd): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isoToYmd(iso: string): Ymd {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/**
 * Parses a purely numeric date string as DD/MM/YYYY (day always first,
 * never MM/DD), e.g. "06/07/2026" or "6/7/2026". Accepts "/", "-", or "."
 * as the separator, with optional whitespace around it (PDF text
 * extraction often renders "06 / 07 / 2026"). Returns null if the string
 * isn't a pure numeric date or doesn't represent a real calendar day.
 */
export function parseNumericDateDDMMYYYY(input: string): Ymd | null {
  const trimmed = input.trim().replace(/\s*([/.\-])\s*/g, "$1");
  const match = trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const ymd = { year, month, day };
  return isValidCalendarDate(ymd) ? ymd : null;
}

/**
 * Parses a date with a text month, e.g. "6 Jul 2026" or "07 June 2026"
 * (day, month name, year — in that order). Returns null if unparseable.
 */
export function parseTextMonthDate(input: string): Ymd | null {
  const trimmed = input.trim().replace(/,/g, "");
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const monthName = match[2].toLowerCase();
  const year = Number(match[3]);
  const month = MONTH_NAMES[monthName];
  if (!month) return null;
  const ymd = { year, month, day };
  return isValidCalendarDate(ymd) ? ymd : null;
}

/**
 * Parses a raw date string of unknown format (numeric DD/MM/YYYY or text
 * month), returning a result that always carries the original raw string so
 * unparseable/blank dates can be flagged rather than silently dropped.
 */
export function parseFlexibleDate(raw: string | null | undefined): DateParseResult {
  const rawTrimmed = typeof raw === "string" ? raw.trim() : "";
  if (!rawTrimmed) {
    return { raw: raw ?? null, iso: null, valid: false };
  }

  const numeric = parseNumericDateDDMMYYYY(rawTrimmed);
  if (numeric) {
    return { raw: rawTrimmed, iso: ymdToIso(numeric), valid: true };
  }

  const textMonth = parseTextMonthDate(rawTrimmed);
  if (textMonth) {
    return { raw: rawTrimmed, iso: ymdToIso(textMonth), valid: true };
  }

  return { raw: rawTrimmed, iso: null, valid: false };
}

export function addDaysIso(iso: string, days: number): string {
  const { year, month, day } = isoToYmd(iso);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return ymdToIso({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export function addYearsIso(iso: string, years: number): string {
  const { year, month, day } = isoToYmd(iso);
  const d = new Date(Date.UTC(year + years, month - 1, day));
  // Handles Feb 29 -> non-leap-year target by rolling to Mar 1, consistent
  // with standard JS date arithmetic (no special-casing needed for this
  // template's use case of adding whole years to a signing date).
  return ymdToIso({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

/**
 * Adds N years and then subtracts one day. Used for term-end-date math,
 * where the start date itself counts as "Day 1" of the term, so a naive
 * "+N years" overcounts by one day — e.g. a 5-year term signed 09/07/2026
 * ends 08/07/2031, not 09/07/2031.
 */
export function addYearsMinusOneDayIso(iso: string, years: number): string {
  return addDaysIso(addYearsIso(iso, years), -1);
}

/** Formats an ISO (YYYY-MM-DD) date string as DD/MM/YYYY for display. */
export function formatIsoAsDDMMYYYY(iso: string): string {
  const { year, month, day } = isoToYmd(iso);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
