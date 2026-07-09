import type { TemplateStrategy } from "./types";
import type { RawExtractedFields, ServiceLine } from "../types";

const JSON_SCHEMA_DESCRIPTION = `Return ONLY a valid JSON object (no markdown, no explanation) with exactly these keys:

{
  "clientLegalEntityName": string | null,       // From "Prepared for X, address" — X is the company name
  "legalEntityAddress": string | null,           // The address following the client name in "Prepared for"
  "focusCorePreparerName": string | null,        // From "Prepared by X" / signature block, e.g. "Ying Ying Aye"
  "focusCorePreparerTitle": string | null,       // Title shown with the preparer, e.g. "General Manager"
  "clientSignerName": string | null,             // From "By: X" in the Client Acceptance / signature section
  "signingDateRaw": string | null,               // The exact raw text of "Date:" in the Client Acceptance section. null if blank/absent.
  "proposalIssueDateRaw": string | null,         // The date printed near the top of PAGE 1, just above/beside the "Background" heading (NOT the Client Acceptance "Date:" field). Often formatted with spaces around the slashes, e.g. "06 / 07 / 2026". Copy it exactly as printed, spaces included.
  "currency": "USD" | "MMK" | null,              // Infer from the Amount column in "Our Professional Fees": "USD" prefix means USD, "MMK" or "Ks" means MMK
  "services": [                                  // One entry for EVERY row in the "Our Professional Fees" table
    { "name": string, "amount": number, "currency": string }
  ],
  "specialNotes": string[]                       // Full paragraph text of any section introduced by a bold heading reading "Special Note" or "Special Rule" (case-insensitive, with or without a trailing period/colon). This heading is NOT part of the standard template and only appears in some contract variants. One array entry per such heading, containing all paragraph text between that heading and the next heading/section break. Empty array [] if no such heading exists anywhere in the document — this is the normal, expected case, not an error.
}

Rules:
- Do not invent values. If a field is not clearly present in the text, use null (or an empty array for services/specialNotes).
- "amount" must be a plain number (no currency symbols, no thousands separators), e.g. 1500 or 2500000.
- Preserve the exact wording of each service "name" as printed, including any "(one-time)" suffix if present — do not strip or paraphrase it.
- signingDateRaw and proposalIssueDateRaw must be copied verbatim from the document (do not reformat or reinterpret the date yourself — a separate step handles date parsing).
- Every row of the "Our Professional Fees" table is a service the client purchased. This template does not use checkboxes or marks — do not attempt to detect selection state.
- Do not confuse "Special Note"/"Special Rule" with any other heading (e.g. "Note:" footnotes within a table, or the standard "Background"/"Client Acceptance" sections). Only headings whose text is exactly (or almost exactly) "Special Note" or "Special Rule" count.`;

function buildExtractionPrompt(pdfText: string): string {
  return `You are extracting key data from a signed Myanmar Incorporation Services Proposal contract (a FocusCore proposal). The document text was extracted from a PDF and is provided below between the markers.

${JSON_SCHEMA_DESCRIPTION}

--- BEGIN DOCUMENT TEXT ---
${pdfText}
--- END DOCUMENT TEXT ---

Return ONLY the JSON object described above.`;
}

function processServices(raw: RawExtractedFields["services"]): ServiceLine[] {
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

export const myanmarIncorporationStrategy: TemplateStrategy = {
  id: "myanmar-incorporation-proposal",
  label: "Myanmar Incorporation Services Proposal",
  buildExtractionPrompt,
  processServices,
};
