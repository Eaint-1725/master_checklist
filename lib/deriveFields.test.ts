import { describe, it, expect } from "vitest";
import { deriveContractFields } from "./deriveFields";

const BASE_INPUT = {
  signingDateRaw: "09/07/2026",
  currency: "USD" as const,
  invoiceDueRaw: "fourteen (14) days",
  initialTermRaw: "five (5) years",
  terminationNoticeRaw: "sixty (60) days",
  autoRenewalCycleRaw: "two (2) year periods",
};

describe("deriveContractFields", () => {
  it("computes Initial Term End Date as signing date + extracted term years - 1 day", () => {
    const result = deriveContractFields(BASE_INPUT);
    expect(result.initialTermEndDate).toBe("2031-07-08");
    expect(result.initialTermEndDate).not.toBe("2031-07-09");
  });

  it("leaves Invoice Due Date as a straightforward signing date + extracted invoice due days, with no -1 day adjustment", () => {
    const result = deriveContractFields(BASE_INPUT);
    expect(result.invoiceDueDate).toBe("2026-07-23");
  });

  it("formats Auto-Renewal and Termination Notice Period from the extracted values", () => {
    const result = deriveContractFields(BASE_INPUT);
    expect(result.autoRenewal).toBe("Yes, 2-year cycles");
    expect(result.terminationNoticePeriod).toBe("60 days");
  });

  it("reads the actual termination notice value rather than assuming 60 days", () => {
    const result = deriveContractFields({ ...BASE_INPUT, terminationNoticeRaw: "75 days" });
    expect(result.terminationNoticePeriod).toBe("75 days");
  });

  it("parses word-only term values the same as digit/parenthetical ones", () => {
    const result = deriveContractFields({
      ...BASE_INPUT,
      initialTermRaw: "five years",
      invoiceDueRaw: "fourteen days",
    });
    expect(result.initialTermEndDate).toBe("2031-07-08");
    expect(result.invoiceDueDate).toBe("2026-07-23");
  });

  it("falls back to a warning string when a term can't be extracted, without blocking the date fields that don't depend on it", () => {
    const result = deriveContractFields({ ...BASE_INPUT, autoRenewalCycleRaw: null, terminationNoticeRaw: null });
    expect(result.autoRenewal).toBe("⚠ Could not extract auto-renewal cycle");
    expect(result.terminationNoticePeriod).toBe("⚠ Could not extract termination notice period");
    expect(result.initialTermEndDate).toBe("2031-07-08");
  });

  it("leaves Initial Term End Date and Invoice Due Date null when the respective term couldn't be extracted, even with a valid signing date", () => {
    const result = deriveContractFields({ ...BASE_INPUT, initialTermRaw: null, invoiceDueRaw: null });
    expect(result.initialTermEndDate).toBeNull();
    expect(result.invoiceDueDate).toBeNull();
  });

  it("does not flag needsReview for missing term values when the signing date itself is valid", () => {
    const result = deriveContractFields({
      ...BASE_INPUT,
      initialTermRaw: null,
      invoiceDueRaw: null,
      terminationNoticeRaw: null,
      autoRenewalCycleRaw: null,
    });
    expect(result.needsReview).toBe(false);
    expect(result.reviewNotes).toEqual([]);
  });
});
