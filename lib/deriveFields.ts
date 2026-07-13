import { parseFlexibleDate, addDaysIso, addYearsMinusOneDayIso } from "./dateUtils";
import { parseWordOrDigitNumber } from "./numberParsing";
import { formatCommercialTaxText, formatStampDutyFeeText } from "./config/contractTerms";
import type { DateParseResult } from "./types";

export interface DeriveInput {
  signingDateRaw: string | null;
  currency: "USD" | "MMK" | null;
  invoiceDueRaw: string | null;
  initialTermRaw: string | null;
  terminationNoticeRaw: string | null;
  autoRenewalCycleRaw: string | null;
}

export interface DerivedContractFields {
  signingDate: DateParseResult;
  contractStartDate: string | null;
  initialTermEndDate: string | null;
  invoiceDueDate: string | null;
  autoRenewal: string;
  terminationNoticePeriod: string;
  commercialTax: string;
  stampDutyClauseApplicable: "Yes" | "No";
  /** "USD 150" when the stamp duty clause applies (MMK contracts), otherwise null — this row is omitted entirely, not shown blank. */
  stampDutyFee: string | null;
  needsReview: boolean;
  reviewNotes: string[];
}

const MISSING_AUTO_RENEWAL = "⚠ Could not extract auto-renewal cycle";
const MISSING_TERMINATION_NOTICE = "⚠ Could not extract termination notice period";

/**
 * Computes every field derived from the signing date, currency, and the
 * per-contract term lengths (invoice due period, initial term, termination
 * notice, auto-renewal cycle — all extracted from the PDF text, not fixed
 * constants). Pure and deterministic so it can be run both right after
 * extraction and again, authoritatively, at Excel-generation time after a
 * human has had a chance to correct the signing date on the review screen.
 *
 * needsReview/reviewNotes stay scoped to Signing Date only: the 4 term
 * fields get overridden to "-" for most template/service combinations
 * (see classifyServicesAndTerm.ts), where a missing raw value is expected
 * rather than an error. The "⚠ Could not extract …" fallback text below
 * only becomes visible when classification actually displays the real
 * value.
 */
export function deriveContractFields(input: DeriveInput): DerivedContractFields {
  const signingDate = parseFlexibleDate(input.signingDateRaw);

  const invoiceDueDays = parseWordOrDigitNumber(input.invoiceDueRaw);
  const initialTermYears = parseWordOrDigitNumber(input.initialTermRaw);
  const terminationNoticeDays = parseWordOrDigitNumber(input.terminationNoticeRaw);
  const autoRenewalCycleYears = parseWordOrDigitNumber(input.autoRenewalCycleRaw);

  const reviewNotes: string[] = [];
  let contractStartDate: string | null = null;
  let initialTermEndDate: string | null = null;
  let invoiceDueDate: string | null = null;

  if (signingDate.valid && signingDate.iso) {
    contractStartDate = signingDate.iso;
    initialTermEndDate =
      initialTermYears != null ? addYearsMinusOneDayIso(signingDate.iso, initialTermYears) : null;
    invoiceDueDate = invoiceDueDays != null ? addDaysIso(signingDate.iso, invoiceDueDays) : null;
  } else {
    reviewNotes.push(
      input.signingDateRaw && input.signingDateRaw.trim()
        ? `Signing Date "${input.signingDateRaw}" could not be parsed as a valid date — please verify and enter it manually.`
        : "Signing Date is blank — please verify and enter it manually."
    );
  }

  const autoRenewal =
    autoRenewalCycleYears != null ? `Yes, ${autoRenewalCycleYears}-year cycles` : MISSING_AUTO_RENEWAL;
  const terminationNoticePeriod =
    terminationNoticeDays != null ? `${terminationNoticeDays} days` : MISSING_TERMINATION_NOTICE;

  const stampDutyClauseApplicable: "Yes" | "No" = input.currency === "MMK" ? "Yes" : "No";
  const stampDutyFee = stampDutyClauseApplicable === "Yes" ? formatStampDutyFeeText() : null;

  return {
    signingDate,
    contractStartDate,
    initialTermEndDate,
    invoiceDueDate,
    autoRenewal,
    terminationNoticePeriod,
    commercialTax: formatCommercialTaxText(),
    stampDutyClauseApplicable,
    stampDutyFee,
    needsReview: !signingDate.valid,
    reviewNotes,
  };
}
