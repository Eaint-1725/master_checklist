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
}

/**
 * Invoicing details entered by hand on the review screen — never extracted
 * from the PDF. PO Code No. is only meaningful (and only rendered/exported)
 * when poProcess is "Yes".
 */
export interface AdditionalInvoicingDetails {
  invoicingEntity: string;
  invoicingEntityAddress: string;
  attentionPerson: string;
  attentionPersonEmail: string;
  taxIdNo: string;
  poProcess: "Yes" | "No" | "";
  poCodeNo: string;
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
  additionalInvoicingDetails: AdditionalInvoicingDetails;

  needsReview: boolean;
  reviewNotes: string[];
}
