// Determines the One-Time Service fields and the Contract Period/Terms
// override based on which services were extracted from the contract.
//
// The Myanmar Incorporation template has a fixed 5-service "baseline"
// package. When a contract contains ONLY baseline services (a full or
// partial subset of the 5), there is no ongoing engagement — the whole
// thing is a one-time transaction, so the multi-year term fields (Initial
// Term End Date, Auto-Renewal, Termination Notice Period) don't apply and
// the One-Time Service Name(s)/Amount breakdown is meaningless (the whole
// package is one-time, not a specific line item). Once ANY non-baseline
// ("other") service is present — e.g. Visa Stay Permit, or any other
// add-on — the engagement is ongoing, so the standard term fields apply
// normally, and the One-Time breakdown narrows to just the non-baseline
// one-time service(s), if any.

export interface ClassifiableService {
  name: string;
  amount: number;
}

export interface NormalTermFields {
  initialTermEndDateDisplay: string;
  autoRenewal: string;
  terminationNoticePeriod: string;
}

export interface ServiceTermClassification {
  oneTimeService: "Yes" | "No";
  oneTimeServiceNames: string[];
  oneTimeServiceAmount: number;
  showOneTimeDetails: boolean;
  initialTermEndDateDisplay: string;
  autoRenewal: string;
  terminationNoticePeriod: string;
}

const NOT_APPLICABLE = "-";

const ONE_TIME_PATTERN = /\(one-time\)/i;

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

/**
 * Pure function: given the full extracted services list and the
 * normally-computed (signing-date-derived) term field displays, decides
 * the final One-Time Service and Contract Period/Terms fields.
 */
export function classifyServicesAndTerm(
  services: ClassifiableService[],
  normal: NormalTermFields
): ServiceTermClassification {
  const otherServices = services.filter((s) => !isBaselineService(s.name));
  const isBaselineOnly = otherServices.length === 0;

  if (isBaselineOnly) {
    return {
      oneTimeService: "Yes",
      oneTimeServiceNames: [],
      oneTimeServiceAmount: 0,
      showOneTimeDetails: false,
      initialTermEndDateDisplay: NOT_APPLICABLE,
      autoRenewal: NOT_APPLICABLE,
      terminationNoticePeriod: NOT_APPLICABLE,
    };
  }

  const otherOneTimeServices = otherServices.filter((s) => ONE_TIME_PATTERN.test(s.name));
  const hasOtherOneTime = otherOneTimeServices.length > 0;

  return {
    oneTimeService: hasOtherOneTime ? "Yes" : "No",
    oneTimeServiceNames: otherOneTimeServices.map((s) => s.name),
    oneTimeServiceAmount: otherOneTimeServices.reduce((sum, s) => sum + s.amount, 0),
    showOneTimeDetails: hasOtherOneTime,
    initialTermEndDateDisplay: normal.initialTermEndDateDisplay,
    autoRenewal: normal.autoRenewal,
    terminationNoticePeriod: normal.terminationNoticePeriod,
  };
}
