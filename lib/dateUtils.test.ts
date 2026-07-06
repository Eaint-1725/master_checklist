import { describe, it, expect } from "vitest";
import {
  parseNumericDateDDMMYYYY,
  parseTextMonthDate,
  parseFlexibleDate,
  addDaysIso,
  addYearsIso,
  formatIsoAsDDMMYYYY,
} from "./dateUtils";

describe("parseNumericDateDDMMYYYY", () => {
  it("parses zero-padded DD/MM/YYYY as day-first", () => {
    expect(parseNumericDateDDMMYYYY("06/07/2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("parses unpadded D/M/YYYY as day-first", () => {
    expect(parseNumericDateDDMMYYYY("6/7/2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("treats an unambiguous day (>12) as day-first, never month-first", () => {
    expect(parseNumericDateDDMMYYYY("25/03/2026")).toEqual({ year: 2026, month: 3, day: 25 });
  });

  it("supports dash and dot separators", () => {
    expect(parseNumericDateDDMMYYYY("06-07-2026")).toEqual({ year: 2026, month: 7, day: 6 });
    expect(parseNumericDateDDMMYYYY("06.07.2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("rejects an impossible calendar date (e.g. day 31 in a 30-day month)", () => {
    expect(parseNumericDateDDMMYYYY("31/04/2026")).toBeNull();
  });

  it("rejects a month greater than 12", () => {
    expect(parseNumericDateDDMMYYYY("15/13/2026")).toBeNull();
  });

  it("returns null for non-numeric or malformed input", () => {
    expect(parseNumericDateDDMMYYYY("6 Jul 2026")).toBeNull();
    expect(parseNumericDateDDMMYYYY("")).toBeNull();
    expect(parseNumericDateDDMMYYYY("not a date")).toBeNull();
  });
});

describe("parseTextMonthDate", () => {
  it("parses abbreviated month name, day-first", () => {
    expect(parseTextMonthDate("6 Jul 2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("parses zero-padded day with full month name", () => {
    expect(parseTextMonthDate("07 June 2026")).toEqual({ year: 2026, month: 6, day: 7 });
  });

  it("is case-insensitive for month names", () => {
    expect(parseTextMonthDate("6 JULY 2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("handles a trailing comma after the day/month", () => {
    expect(parseTextMonthDate("6 Jul, 2026")).toEqual({ year: 2026, month: 7, day: 6 });
  });

  it("returns null for an unrecognized month name", () => {
    expect(parseTextMonthDate("6 Foo 2026")).toBeNull();
  });

  it("returns null for purely numeric input", () => {
    expect(parseTextMonthDate("06/07/2026")).toBeNull();
  });
});

describe("parseFlexibleDate", () => {
  it("parses a numeric date and reports it valid with an ISO value", () => {
    const result = parseFlexibleDate("06/07/2026");
    expect(result).toEqual({ raw: "06/07/2026", iso: "2026-07-06", valid: true });
  });

  it("parses a text-month date and reports it valid with an ISO value", () => {
    const result = parseFlexibleDate("6 Jul 2026");
    expect(result).toEqual({ raw: "6 Jul 2026", iso: "2026-07-06", valid: true });
  });

  it("flags a blank string as invalid rather than falling back to anything", () => {
    const result = parseFlexibleDate("");
    expect(result.valid).toBe(false);
    expect(result.iso).toBeNull();
  });

  it("flags null/undefined as invalid", () => {
    expect(parseFlexibleDate(null).valid).toBe(false);
    expect(parseFlexibleDate(undefined).valid).toBe(false);
  });

  it("flags unparseable text as invalid but preserves the raw string for manual review", () => {
    const result = parseFlexibleDate("TBD");
    expect(result.valid).toBe(false);
    expect(result.iso).toBeNull();
    expect(result.raw).toBe("TBD");
  });
});

describe("addDaysIso", () => {
  it("adds 14 days for the invoice due date rule", () => {
    expect(addDaysIso("2026-07-06", 14)).toBe("2026-07-20");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysIso("2026-07-25", 14)).toBe("2026-08-08");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysIso("2026-12-25", 14)).toBe("2027-01-08");
  });
});

describe("addYearsIso", () => {
  it("adds 5 years for the initial term end date rule", () => {
    expect(addYearsIso("2026-07-06", 5)).toBe("2031-07-06");
  });

  it("handles a Feb 29 signing date in a leap year", () => {
    // 2028 is a leap year; +5 years lands on 2033, a non-leap year.
    expect(addYearsIso("2028-02-29", 5)).toBe("2033-03-01");
  });
});

describe("formatIsoAsDDMMYYYY", () => {
  it("formats an ISO date as DD/MM/YYYY", () => {
    expect(formatIsoAsDDMMYYYY("2026-07-06")).toBe("06/07/2026");
  });
});
