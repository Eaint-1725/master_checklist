import { describe, it, expect } from "vitest";
import { deriveContractFields } from "./deriveFields";

describe("deriveContractFields", () => {
  it("computes Initial Term End Date as signing date + 5 years - 1 day", () => {
    const result = deriveContractFields({
      signingDateRaw: "09/07/2026",
      proposalIssueDateRaw: null,
      currency: "USD",
    });
    expect(result.initialTermEndDate).toBe("2031-07-08");
    expect(result.initialTermEndDate).not.toBe("2031-07-09");
  });

  it("leaves Invoice Due Date as a straightforward signing date + 14 days, with no -1 day adjustment", () => {
    const result = deriveContractFields({
      signingDateRaw: "09/07/2026",
      proposalIssueDateRaw: null,
      currency: "USD",
    });
    expect(result.invoiceDueDate).toBe("2026-07-23");
  });
});
