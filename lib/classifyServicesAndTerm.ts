// Determines the One-Time Service(s) Yes/No field and the Contract Period/Terms
// override, branching on which proposal template the contract is.
//
// INCORPORATION: the Myanmar Incorporation template has a fixed 5-service
// "baseline" package. When a contract contains ONLY baseline services (a
// full or partial subset of the 5), there is no ongoing engagement — the
// whole thing is a one-time transaction, so the multi-year term fields
// (Initial Term End Date, Auto-Renewal, Termination Notice Period) don't
// apply. Once ANY non-baseline ("other") service is present — e.g. Visa
// Stay Permit, or any other add-on — the engagement is ongoing, so the
// standard term fields apply normally, and One-Time Service(s) is Yes only
// if one of those non-baseline services is itself a one-time service.
//
// VISA STAY PERMIT / AUDIT: always a one-time transaction regardless of
// services present — One-Time Service(s) is always "Yes" and the term
// fields are always "-".
//
// TAX COMPLIANCE: One-Time Service(s) is always "No" (fixed override — no
// "(one-time)" name detection for this template), so the term fields
// (Initial Term End Date, Termination Notice Period) always calculate
// normally from the extracted contract values. Auto-Renewal always displays
// "Yes, 5 years cycle" regardless of the contract's actual extracted cycle
// (a fixed override specific to this template).

import type { TemplateType } from "./types";

export interface ClassifiableService {
  name: string;
  amount: number;
}

/** The "if this were an ongoing engagement" display strings, precomputed by deriveFields.ts from the extracted per-contract term values. */
export interface NormalTermFields {
  initialTermEndDateDisplay: string;
  autoRenewal: string;
  terminationNoticePeriod: string;
}

export interface ServiceTermClassification {
  oneTimeService: "Yes" | "No";
  initialTermEndDateDisplay: string;
  autoRenewal: string;
  terminationNoticePeriod: string;
}

const NOT_APPLICABLE = "-";
const ONE_TIME_PATTERN = /\(one-time\)/i;
const TAX_COMPLIANCE_AUTO_RENEWAL = "Yes, 5 years cycle";

// "Visa Stay Permit" is deliberately excluded — it's a common
// incorporation-adjacent add-on but not part of the baseline package.
const BASELINE_SERVICE_NAMES = [
  "Incorporation of a Private Company Limited by Shares",
  "Bank Account Setup (per bank)",
  'Application for Business Identification number ("TIN")',
  "Commercial Tax registration (per annum)",
  "Commercial Tax and Corporate Income Tax registration for e-filing and payment (one-time)",
];

function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const BASELINE_NORMALIZED = new Set(BASELINE_SERVICE_NAMES.map(normalizeServiceName));

export function isBaselineService(name: string): boolean {
  return BASELINE_NORMALIZED.has(normalizeServiceName(name));
}

function classifyIncorporation(
  services: ClassifiableService[],
  extractedTerms: NormalTermFields
): ServiceTermClassification {
  const otherServices = services.filter((s) => !isBaselineService(s.name));
  const isBaselineOnly = otherServices.length === 0;
  const hasOtherOneTime = otherServices.some((s) => ONE_TIME_PATTERN.test(s.name));

  // The "-" override applies whenever the final One-Time Service(s) value
  // is "Yes" — whether that Yes came from Case A (baseline services only)
  // or Case B (a non-baseline one-time service was added) — not just Case A.
  const oneTimeService: "Yes" | "No" = isBaselineOnly || hasOtherOneTime ? "Yes" : "No";

  if (oneTimeService === "Yes") {
    return {
      oneTimeService: "Yes",
      initialTermEndDateDisplay: NOT_APPLICABLE,
      autoRenewal: NOT_APPLICABLE,
      terminationNoticePeriod: NOT_APPLICABLE,
    };
  }

  return {
    oneTimeService: "No",
    initialTermEndDateDisplay: extractedTerms.initialTermEndDateDisplay,
    autoRenewal: extractedTerms.autoRenewal,
    terminationNoticePeriod: extractedTerms.terminationNoticePeriod,
  };
}

function classifyAlwaysOneTime(): ServiceTermClassification {
  return {
    oneTimeService: "Yes",
    initialTermEndDateDisplay: NOT_APPLICABLE,
    autoRenewal: NOT_APPLICABLE,
    terminationNoticePeriod: NOT_APPLICABLE,
  };
}

function classifyTaxCompliance(extractedTerms: NormalTermFields): ServiceTermClassification {
  return {
    oneTimeService: "No",
    initialTermEndDateDisplay: extractedTerms.initialTermEndDateDisplay,
    autoRenewal: TAX_COMPLIANCE_AUTO_RENEWAL,
    terminationNoticePeriod: extractedTerms.terminationNoticePeriod,
  };
}

/**
 * Pure function: given the full extracted services list, the template
 * type, and the normally-computed (signing-date-derived) term field
 * displays, decides the final One-Time Service and Contract Period/Terms
 * fields.
 */
export function classifyServicesAndTerm(
  services: ClassifiableService[],
  templateType: TemplateType,
  extractedTerms: NormalTermFields
): ServiceTermClassification {
  switch (templateType) {
    case "incorporation":
      return classifyIncorporation(services, extractedTerms);
    case "visa-stay-permit":
    case "audit":
      return classifyAlwaysOneTime();
    case "tax-compliance":
      return classifyTaxCompliance(extractedTerms);
    default: {
      const exhaustiveCheck: never = templateType;
      throw new Error(`Unknown template type: ${exhaustiveCheck}`);
    }
  }
}
