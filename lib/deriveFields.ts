import { parseFlexibleDate, addDaysIso, addYearsIso } from "./dateUtils";
import {
  CONTRACT_TERMS,
  formatAutoRenewalText,
  formatTerminationNoticeText,
  formatCommercialTaxText,
} from "./config/contractTerms";
import type { DateParseResult } from "./types";

export interface DeriveInput {
  signingDateRaw: string | null;
  proposalIssueDateRaw: string | null;
  currency: "USD" | "MMK" | null;
}

export interface DerivedContractFields {
  signingDate: DateParseResult;
  proposalIssueDate: DateParseResult;
  contractStartDate: string | null;
  initialTermEndDate: string | null;
  invoiceDueDate: string | null;
  autoRenewal: string;
  terminationNoticePeriod: string;
  commercialTax: string;
  stampDutyClauseApplicable: "Yes" | "No";
  needsReview: boolean;
  reviewNotes: string[];
}

/**
 * Computes every field derived from the signing date and currency. Pure and
 * deterministic so it can be run both right after extraction and again,
 * authoritatively, at Excel-generation time after a human has had a chance
 * to correct the signing date on the review screen.
 */
export function deriveContractFields(input: DeriveInput): DerivedContractFields {
  const signingDate = parseFlexibleDate(input.signingDateRaw);
  const proposalIssueDate = parseFlexibleDate(input.proposalIssueDateRaw);

  const reviewNotes: string[] = [];
  let contractStartDate: string | null = null;
  let initialTermEndDate: string | null = null;
  let invoiceDueDate: string | null = null;

  if (signingDate.valid && signingDate.iso) {
    contractStartDate = signingDate.iso;
    initialTermEndDate = addYearsIso(signingDate.iso, CONTRACT_TERMS.initialTermYears);
    invoiceDueDate = addDaysIso(signingDate.iso, CONTRACT_TERMS.invoiceDueDays);
  } else {
    reviewNotes.push(
      input.signingDateRaw && input.signingDateRaw.trim()
        ? `Signing Date "${input.signingDateRaw}" could not be parsed as a valid date — please verify and enter it manually.`
        : "Signing Date is blank — please verify and enter it manually."
    );
  }

  const stampDutyClauseApplicable: "Yes" | "No" = input.currency === "MMK" ? "Yes" : "No";

  return {
    signingDate,
    proposalIssueDate,
    contractStartDate,
    initialTermEndDate,
    invoiceDueDate,
    autoRenewal: formatAutoRenewalText(),
    terminationNoticePeriod: formatTerminationNoticeText(),
    commercialTax: formatCommercialTaxText(),
    stampDutyClauseApplicable,
    needsReview: !signingDate.valid,
    reviewNotes,
  };
}
