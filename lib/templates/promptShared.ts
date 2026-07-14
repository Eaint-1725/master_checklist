import type { RawExtractedFields, ServiceLine } from "../types";

// Shared extraction prompt/schema and service-processing logic for every
// FocusCore proposal template. All 4 templates follow the same document
// structure (Prepared for/by, Client Acceptance w/ signing date, "Our
// Professional Fees" table, an "Invoicing" section) and differ only in the
// services on offer — template-specific One-Time-Service/term
// classification happens later, in classifyServicesAndTerm.ts, not here.

// The known-standard boilerplate text of the "Invoicing" section, as it
// appears in an unmodified FocusCore proposal. Per-contract variables (the
// due-day count, and any client-specific wording FocusCore substitutes in
// the same slots) are expected to differ and are NOT "special". Anything
// beyond this — extra sentences, different payment terms, added conditions
// — is a Special Invoicing Rule.
const STANDARD_INVOICING_TEXT = `An invoice in respect of service fees will be issued upon signing the agreement and will be due fourteen (14) days from the invoice issued date. A reimbursement note for government fees, expenses (if any) to be paid for and on behalf of the Client will be issued upon confirmation of the final amounts with the relevant authorities. FocusCore will not make any payments on behalf of the Client unless it has first been put in funds.

Please note that all fees exclude associated government fees, disbursements and out-of-pocket expenses such as courier charges, also note that Myanmar Commercial Tax, currently five percent (5%) will be applicable. The Client is responsible for all tax and all applicable bank fees associated with the delivery of the service.`;

function buildSchemaDescription(): string {
  return `Return ONLY a valid JSON object (no markdown, no explanation) with exactly these keys:

{
  "clientLegalEntityName": string | null,       // From "Prepared for X, address" — X is the company name
  "legalEntityAddress": string | null,           // The address following the client name in "Prepared for"
  "focusCorePreparerName": string | null,        // From "Prepared by X" / signature block, e.g. "Ying Ying Aye"
  "focusCorePreparerTitle": string | null,       // Title shown with the preparer, e.g. "General Manager"
  "clientSignerName": string | null,             // From "By: X" in the Client Acceptance / signature section
  "signingDateRaw": string | null,               // The exact raw text of "Date:" in the Client Acceptance section. null if blank/absent.
  "currency": "USD" | "MMK" | null,              // Infer from the Amount column in "Our Professional Fees": "USD" prefix means USD, "MMK" or "Ks" means MMK
  "invoiceDueRaw": string | null,                // The invoice payment due period as printed, e.g. "fourteen (14) days" or "30 days". Copy verbatim — do not compute or reformat. null if not stated anywhere.
  "initialTermRaw": string | null,               // The initial contract term length as printed, e.g. "five (5) years". Copy verbatim. null if not stated anywhere.
  "terminationNoticeRaw": string | null,         // The termination notice period as printed, e.g. "sixty (60) days" or "75 days" — read the actual printed value, do not assume a standard number. Copy verbatim. null if not stated anywhere.
  "autoRenewalCycleRaw": string | null,          // The auto-renewal cycle length as printed, e.g. "two (2) year periods". Copy verbatim. null if not stated anywhere.
  "services": [                                  // One entry for EVERY row in the "Our Professional Fees" table
    { "name": string, "amount": number, "currency": string }
  ],
  "specialNotes": string[]                       // Special Invoicing Rule content — see "Special Invoicing Rule detection" below. Empty array [] when the Invoicing section matches the standard boilerplate — this is the normal, expected case, not an error.
}

Rules:
- Do not invent values. If a field is not clearly present in the text, use null (or an empty array for services/specialNotes).
- "amount" must be a plain number (no currency symbols, no thousands separators), e.g. 1500 or 2500000.
- Preserve the exact wording of each service "name" as printed, including any "(one-time)" suffix if present — do not strip or paraphrase it.
- signingDateRaw must be copied verbatim from the document (do not reformat or reinterpret the date yourself — a separate step handles date parsing).
- Copy invoiceDueRaw, initialTermRaw, terminationNoticeRaw, and autoRenewalCycleRaw exactly as printed, including any word-and-parenthetical-digit form (e.g. "fourteen (14) days") — a separate step handles numeric parsing. Use null if that term is not mentioned anywhere in the document.
- Every row of the "Our Professional Fees" table is a service the client purchased. This template does not use checkboxes or marks — do not attempt to detect selection state.

Special Invoicing Rule detection (specialNotes):
Special Invoicing Rule content is NOT a separately-headed section — it lives INSIDE the document's own section titled "Invoicing" (the section covering when/how invoices are issued and paid). To detect it:
1. Locate the section of the document headed "Invoicing" and read its full text.
2. Compare that text, sentence by sentence, against this KNOWN STANDARD boilerplate:

"""
${STANDARD_INVOICING_TEXT}
"""

3. Expected per-contract variable substitutions are NOT special — e.g. a different due-day count (say "thirty (30) days" instead of "fourteen (14) days"), or the client's name/details slotted into the same sentence structure. Ignore these differences.
4. Any ADDITIONAL sentence(s) in the Invoicing section that aren't part of the standard boilerplate above, or wording that changes the actual payment terms/conditions (not just a variable substitution), is a Special Invoicing Rule. Extract that additional/different text verbatim into "specialNotes" (one array entry per such sentence or block).
5. If the Invoicing section's text matches the standard boilerplate aside from expected variable substitutions, there is NO Special Invoicing Rule — return "specialNotes": [].
6. Do not pull content from any other section (e.g. "Terms and conditions", "Background") into specialNotes, even if it also discusses fees or payments — only the "Invoicing" section's own text is compared.`;
}

export function buildStandardPrompt(pdfText: string, documentLabel: string): string {
  return `You are extracting key data from a signed ${documentLabel} contract (a FocusCore proposal). The document text was extracted from a PDF and is provided below between the markers.

${buildSchemaDescription()}

--- BEGIN DOCUMENT TEXT ---
${pdfText}
--- END DOCUMENT TEXT ---

Return ONLY the JSON object described above.`;
}

export function processStandardServices(raw: RawExtractedFields["services"]): ServiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.name === "string" && s.name.trim().length > 0)
    .map((s) => ({
      name: s.name.trim(),
      amount: typeof s.amount === "number" && !Number.isNaN(s.amount) ? s.amount : 0,
      currency: s.currency || "",
      isOneTime: /\(one-time\)/i.test(s.name),
    }));
}
