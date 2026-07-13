// Standard boilerplate T&Cs shared across all proposal templates. These are
// fixed (not per-client), unlike invoice due period / initial term /
// termination notice / auto-renewal cycle, which now vary per contract and
// are extracted from the PDF (see lib/numberParsing.ts, lib/deriveFields.ts).

export const CONTRACT_TERMS = {
  commercialTaxRate: 0.05,
  stampDutyFeeText: "USD 150",
} as const;

export function formatCommercialTaxText(): string {
  return `${CONTRACT_TERMS.commercialTaxRate * 100}%`;
}

export function formatStampDutyFeeText(): string {
  return CONTRACT_TERMS.stampDutyFeeText;
}
