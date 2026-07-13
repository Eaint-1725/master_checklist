import type { RawExtractedFields, ServiceLine } from "../types";

// Shared extraction prompt/schema and service-processing logic for every
// FocusCore proposal template. All 4 templates follow the same document
// structure (Prepared for/by, Client Acceptance w/ signing date, "Our
// Professional Fees" table, optional Special Note section) and differ only
// in the services on offer — template-specific One-Time-Service/term
// classification happens later, in classifyServicesAndTerm.ts, not here.

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
  "specialNotes": string[]                       // Full paragraph text of any section introduced by a bold heading reading "Special Note" or "Special Rule" (case-insensitive, with or without a trailing period/colon). This heading is NOT part of the standard template and only appears in some contract variants. One array entry per such heading, containing all paragraph text between that heading and the next heading/section break. Empty array [] if no such heading exists anywhere in the document — this is the normal, expected case, not an error.
}

Rules:
- Do not invent values. If a field is not clearly present in the text, use null (or an empty array for services/specialNotes).
- "amount" must be a plain number (no currency symbols, no thousands separators), e.g. 1500 or 2500000.
- Preserve the exact wording of each service "name" as printed, including any "(one-time)" suffix if present — do not strip or paraphrase it.
- signingDateRaw must be copied verbatim from the document (do not reformat or reinterpret the date yourself — a separate step handles date parsing).
- Copy invoiceDueRaw, initialTermRaw, terminationNoticeRaw, and autoRenewalCycleRaw exactly as printed, including any word-and-parenthetical-digit form (e.g. "fourteen (14) days") — a separate step handles numeric parsing. Use null if that term is not mentioned anywhere in the document.
- Every row of the "Our Professional Fees" table is a service the client purchased. This template does not use checkboxes or marks — do not attempt to detect selection state.
- Do not confuse "Special Note"/"Special Rule" with any other heading (e.g. "Note:" footnotes within a table, or the standard "Background"/"Client Acceptance" sections). Only headings whose text is exactly (or almost exactly) "Special Note" or "Special Rule" count.`;
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
