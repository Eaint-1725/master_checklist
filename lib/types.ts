// Shared data shapes used across extraction, date math, and Excel generation.

export interface ServiceLine {
  name: string;
  amount: number;
  currency: string;
  isOneTime: boolean;
}

/** Fields returned directly by the LLM extraction step, before date math. */
export interface RawExtractedFields {
  clientLegalEntityName: string | null;
  legalEntityAddress: string | null;
  focusCorePreparerName: string | null;
  focusCorePreparerTitle: string | null;
  clientSignerName: string | null;
  signingDateRaw: string | null;
  proposalIssueDateRaw: string | null;
  currency: "USD" | "MMK" | null;
  services: { name: string; amount: number; currency: string }[];
  additionalServices: string[];
}

export interface DateParseResult {
  raw: string | null;
  iso: string | null;
  valid: boolean;
}

/** Fully processed record: raw extraction + derived date/financial fields, ready for review/Excel. */
export interface ExtractedFields {
  clientLegalEntityName: string | null;
  legalEntityAddress: string | null;
  focusCorePreparer: string | null;
  clientSignerName: string | null;

  signingDate: DateParseResult;
  proposalIssueDate: DateParseResult;
  contractStartDate: string | null;
  initialTermEndDate: string | null;
  invoiceDueDate: string | null;
  autoRenewal: string;
  terminationNoticePeriod: string;

  contractCurrency: "USD" | "MMK" | null;
  commercialTax: string;
  stampDutyClauseApplicable: "Yes" | "No";

  services: ServiceLine[];
  additionalServices: string[];

  needsReview: boolean;
  reviewNotes: string[];
}
