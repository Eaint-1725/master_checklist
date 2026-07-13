// Shared data shapes used across extraction, date math, and Excel generation.

/**
 * Which contract proposal template a document is. Drives the extraction
 * prompt (lib/templates/registry.ts) and the One-Time-Service/term-field
 * classification rules (lib/classifyServicesAndTerm.ts).
 */
export type TemplateType = "incorporation" | "visa-stay-permit" | "tax-compliance" | "audit";

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
  currency: "USD" | "MMK" | null;
  /** As printed, e.g. "fourteen (14) days" — parsed separately, not here. */
  invoiceDueRaw: string | null;
  /** As printed, e.g. "five (5) years" — parsed separately, not here. */
  initialTermRaw: string | null;
  /** As printed, e.g. "sixty (60) days" or "75 days" — parsed separately, not here. */
  terminationNoticeRaw: string | null;
  /** As printed, e.g. "two (2) year periods" — parsed separately, not here. */
  autoRenewalCycleRaw: string | null;
  services: { name: string; amount: number; currency: string }[];
  /** Paragraph(s) following any "Special Note"/"Special Rule" heading, one entry per section. Empty when absent (the normal case). */
  specialNotes: string[];
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
  templateType: TemplateType;

  clientLegalEntityName: string | null;
  legalEntityAddress: string | null;
  focusCorePreparer: string | null;
  clientSignerName: string | null;

  signingDate: DateParseResult;
  contractStartDate: string | null;
  initialTermEndDate: string | null;
  invoiceDueDate: string | null;
  autoRenewal: string;
  terminationNoticePeriod: string;

  /** Raw per-contract term text, carried through unedited so the server can authoritatively recompute at generate-time (same pattern as signingDate.raw). */
  invoiceDueRaw: string | null;
  initialTermRaw: string | null;
  terminationNoticeRaw: string | null;
  autoRenewalCycleRaw: string | null;

  contractCurrency: "USD" | "MMK" | null;
  commercialTax: string;
  stampDutyClauseApplicable: "Yes" | "No";
  /** "USD 150" when the stamp duty clause applies, otherwise null — omit the row entirely, don't show blank. */
  stampDutyFee: string | null;

  services: ServiceLine[];
  additionalInvoicingDetails: AdditionalInvoicingDetails;
  /** Extracted "Special Note"/"Special Rule" paragraph(s), if any. Empty when none were found (the normal case). */
  specialNotes: string[];

  needsReview: boolean;
  reviewNotes: string[];
}
