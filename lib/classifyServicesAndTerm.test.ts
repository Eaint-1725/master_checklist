import { describe, it, expect } from "vitest";
import { classifyServicesAndTerm, isBaselineService, type ClassifiableService } from "./classifyServicesAndTerm";

const NORMAL = {
  initialTermEndDateDisplay: "06/07/2031",
  autoRenewal: "Yes, 2-year cycles",
  terminationNoticePeriod: "60 days",
};

const BASELINE_5: ClassifiableService[] = [
  { name: "Incorporation of a Private Company Limited by Shares", amount: 1650 },
  { name: "Bank Account Setup (per bank)", amount: 550 },
  { name: 'Application for Business Identification number ("TIN")', amount: 195 },
  { name: "Commercial Tax registration (per annum)", amount: 425 },
  {
    name: "Commercial Tax and Corporate Income Tax registration for e-filing and payment (one-time)",
    amount: 195,
  },
];

describe("isBaselineService", () => {
  it("matches baseline names allowing minor whitespace/punctuation variance", () => {
    expect(isBaselineService("Bank Account Setup (per bank)")).toBe(true);
    expect(isBaselineService("bank account setup (per bank)")).toBe(true);
    expect(isBaselineService("Bank  Account   Setup(per bank)")).toBe(true);
    expect(isBaselineService('Application for Business Identification number (“TIN”)')).toBe(
      true
    );
  });

  it("does not match Visa Stay Permit or other non-baseline services", () => {
    expect(isBaselineService("Visa Stay Permit")).toBe(false);
    expect(isBaselineService("Visa Stay Permit (one-time)")).toBe(false);
    expect(isBaselineService("Some Other Add-on Service")).toBe(false);
  });
});

describe("classifyServicesAndTerm — incorporation", () => {
  it("Case A — all 5 baseline services: one-time Yes, term fields are '-'", () => {
    const result = classifyServicesAndTerm(BASELINE_5, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case A — subset missing Bank Account Setup: still baseline-only", () => {
    const subset = BASELINE_5.filter((s) => s.name !== "Bank Account Setup (per bank)");
    const result = classifyServicesAndTerm(subset, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case B — Visa Stay Permit added (not one-time): One-Time = No, term fields normal", () => {
    const services = [...BASELINE_5, { name: "Visa Stay Permit", amount: 300 }];
    const result = classifyServicesAndTerm(services, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("No");
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.autoRenewal).toBe(NORMAL.autoRenewal);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("Case B — an 'other' one-time service added: One-Time = Yes AND term fields are '-' (not calculated)", () => {
    const services = [...BASELINE_5, { name: "Visa Stay Permit (one-time)", amount: 300 }];
    const result = classifyServicesAndTerm(services, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case B — both a one-time and non-one-time 'other' service present: One-Time = Yes AND term fields are '-'", () => {
    const services = [
      ...BASELINE_5,
      { name: "Visa Stay Permit", amount: 300 },
      { name: "Office Address Service (one-time)", amount: 150 },
    ];
    const result = classifyServicesAndTerm(services, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case B — baseline services plus a non-baseline one-time add-on (e.g. Xero set-up): One-Time = Yes AND all three term fields are '-'", () => {
    const services = [...BASELINE_5, { name: "Xero set-up (one-time)", amount: 550 }];
    const result = classifyServicesAndTerm(services, "incorporation", NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });
});

describe.each(["visa-stay-permit", "audit"] as const)("classifyServicesAndTerm — %s", (templateType) => {
  it("is always One-Time = Yes with '-' term fields, even for baseline-looking services", () => {
    const result = classifyServicesAndTerm(BASELINE_5, templateType, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("is always One-Time = Yes with '-' term fields for a non-baseline, non-one-time service", () => {
    const result = classifyServicesAndTerm(
      [{ name: "Visa Stay Permit", amount: 300 }],
      templateType,
      NORMAL
    );
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("is always One-Time = Yes with '-' term fields for an explicitly one-time service", () => {
    const result = classifyServicesAndTerm(
      [{ name: "Visa Stay Permit (one-time)", amount: 300 }],
      templateType,
      NORMAL
    );
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("is always One-Time = Yes with '-' term fields even with an empty services list", () => {
    const result = classifyServicesAndTerm([], templateType, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });
});

describe("classifyServicesAndTerm — tax-compliance", () => {
  it("One-Time = No and term fields calculate normally even when a service is marked (one-time)", () => {
    const services = [{ name: "Tax Health Check (one-time)", amount: 400 }];
    const result = classifyServicesAndTerm(services, "tax-compliance", NORMAL);
    expect(result.oneTimeService).toBe("No");
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("One-Time = No and term fields calculate normally when no service is (one-time)", () => {
    const services = [{ name: "Monthly Tax Filing", amount: 200 }];
    const result = classifyServicesAndTerm(services, "tax-compliance", NORMAL);
    expect(result.oneTimeService).toBe("No");
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("One-Time = No even with an empty services list", () => {
    const result = classifyServicesAndTerm([], "tax-compliance", NORMAL);
    expect(result.oneTimeService).toBe("No");
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("Auto-Renewal always displays 'Yes, 5 years cycle', overriding the extracted cycle, when One-Time = No", () => {
    const services = [{ name: "Monthly Tax Filing", amount: 200 }];
    // NORMAL.autoRenewal is "Yes, 2-year cycles" — prove the override actually fires
    // rather than coincidentally matching.
    const result = classifyServicesAndTerm(services, "tax-compliance", NORMAL);
    expect(result.autoRenewal).toBe("Yes, 5 years cycle");
    expect(result.autoRenewal).not.toBe(NORMAL.autoRenewal);
  });

  it("Auto-Renewal is still 'Yes, 5 years cycle' regardless of what the extracted cycle display says", () => {
    const services = [{ name: "Monthly Tax Filing", amount: 200 }];
    const result = classifyServicesAndTerm(services, "tax-compliance", {
      ...NORMAL,
      autoRenewal: "Yes, 3-year cycles",
    });
    expect(result.autoRenewal).toBe("Yes, 5 years cycle");
  });
});
