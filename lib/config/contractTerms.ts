// Standard boilerplate T&Cs for the Myanmar Incorporation Services Proposal
// template. These are fixed per this template type (not per-client), but kept
// in one place so they can be updated if the template's standard terms change.

export const CONTRACT_TERMS = {
  initialTermYears: 5,
  autoRenewalCycleYears: 2,
  terminationNoticeDays: 60,
  invoiceDueDays: 14,
  commercialTaxRate: 0.05,
} as const;

export function formatAutoRenewalText(): string {
  return `Yes, ${CONTRACT_TERMS.autoRenewalCycleYears}-year cycles`;
}

export function formatTerminationNoticeText(): string {
  return `${CONTRACT_TERMS.terminationNoticeDays} days`;
}

export function formatCommercialTaxText(): string {
  return `${CONTRACT_TERMS.commercialTaxRate * 100}%`;
}
