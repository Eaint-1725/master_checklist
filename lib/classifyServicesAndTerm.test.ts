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

describe("classifyServicesAndTerm", () => {
  it("Case A — all 5 baseline services: one-time Yes, no name/amount, term fields are '-'", () => {
    const result = classifyServicesAndTerm(BASELINE_5, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.showOneTimeDetails).toBe(false);
    expect(result.oneTimeServiceNames).toEqual([]);
    expect(result.oneTimeServiceAmount).toBe(0);
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case A — subset missing Bank Account Setup: still baseline-only", () => {
    const subset = BASELINE_5.filter((s) => s.name !== "Bank Account Setup (per bank)");
    const result = classifyServicesAndTerm(subset, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.showOneTimeDetails).toBe(false);
    expect(result.initialTermEndDateDisplay).toBe("-");
    expect(result.autoRenewal).toBe("-");
    expect(result.terminationNoticePeriod).toBe("-");
  });

  it("Case B — Visa Stay Permit added (not one-time): One-Time = No, term fields normal", () => {
    const services = [...BASELINE_5, { name: "Visa Stay Permit", amount: 300 }];
    const result = classifyServicesAndTerm(services, NORMAL);
    expect(result.oneTimeService).toBe("No");
    expect(result.showOneTimeDetails).toBe(false);
    expect(result.oneTimeServiceNames).toEqual([]);
    expect(result.oneTimeServiceAmount).toBe(0);
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.autoRenewal).toBe(NORMAL.autoRenewal);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("Case B — an 'other' one-time service added: One-Time = Yes, name/amount shown for that service only", () => {
    const services = [...BASELINE_5, { name: "Visa Stay Permit (one-time)", amount: 300 }];
    const result = classifyServicesAndTerm(services, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.showOneTimeDetails).toBe(true);
    expect(result.oneTimeServiceNames).toEqual(["Visa Stay Permit (one-time)"]);
    expect(result.oneTimeServiceAmount).toBe(300);
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.autoRenewal).toBe(NORMAL.autoRenewal);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });

  it("Case B — both a one-time and non-one-time 'other' service present: only the one-time other is named", () => {
    const services = [
      ...BASELINE_5,
      { name: "Visa Stay Permit", amount: 300 },
      { name: "Office Address Service (one-time)", amount: 150 },
    ];
    const result = classifyServicesAndTerm(services, NORMAL);
    expect(result.oneTimeService).toBe("Yes");
    expect(result.showOneTimeDetails).toBe(true);
    expect(result.oneTimeServiceNames).toEqual(["Office Address Service (one-time)"]);
    expect(result.oneTimeServiceAmount).toBe(150);
    expect(result.initialTermEndDateDisplay).toBe(NORMAL.initialTermEndDateDisplay);
    expect(result.autoRenewal).toBe(NORMAL.autoRenewal);
    expect(result.terminationNoticePeriod).toBe(NORMAL.terminationNoticePeriod);
  });
});
