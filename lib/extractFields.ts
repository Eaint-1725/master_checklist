import OpenAI from "openai";
import { extractPdfText } from "./pdfText";
import { getTemplateStrategy, DEFAULT_TEMPLATE_TYPE } from "./templates/registry";
import { deriveContractFields } from "./deriveFields";
import type {
  AdditionalInvoicingDetails,
  ExtractedFields,
  RawExtractedFields,
  TemplateType,
} from "./types";

export class ExtractionError extends Error {}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new ExtractionError("OPENAI_API_KEY is not configured.");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function parseRawResponse(raw: string): RawExtractedFields {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ExtractionError("The model did not return valid JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  return {
    clientLegalEntityName: (obj.clientLegalEntityName as string) ?? null,
    legalEntityAddress: (obj.legalEntityAddress as string) ?? null,
    focusCorePreparerName: (obj.focusCorePreparerName as string) ?? null,
    focusCorePreparerTitle: (obj.focusCorePreparerTitle as string) ?? null,
    clientSignerName: (obj.clientSignerName as string) ?? null,
    signingDateRaw: (obj.signingDateRaw as string) ?? null,
    currency: (obj.currency as "USD" | "MMK") ?? null,
    invoiceDueRaw: (obj.invoiceDueRaw as string) ?? null,
    initialTermRaw: (obj.initialTermRaw as string) ?? null,
    terminationNoticeRaw: (obj.terminationNoticeRaw as string) ?? null,
    autoRenewalCycleRaw: (obj.autoRenewalCycleRaw as string) ?? null,
    services: Array.isArray(obj.services) ? (obj.services as RawExtractedFields["services"]) : [],
    specialNotes: Array.isArray(obj.specialNotes)
      ? (obj.specialNotes as unknown[])
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
      : [],
  };
}

const EMPTY_INVOICING_DETAILS: AdditionalInvoicingDetails = {
  invoicingEntity: "",
  invoicingEntityAddress: "",
  attentionPerson: "",
  attentionPersonEmail: "",
  taxIdNo: "",
  poProcess: "",
  poCodeNo: "",
};

async function callOpenAI(prompt: string): Promise<string> {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 3000,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content || "";
  if (!text) {
    throw new ExtractionError("OpenAI returned an empty response.");
  }
  return text;
}

function combinePreparer(name: string | null, title: string | null): string | null {
  if (!name && !title) return null;
  if (name && title) return `${name}, ${title}`;
  return name ?? title;
}

export async function extractFields(
  pdfBuffer: Buffer,
  templateType: TemplateType = DEFAULT_TEMPLATE_TYPE
): Promise<ExtractedFields> {
  const strategy = getTemplateStrategy(templateType);
  const pdfText = await extractPdfText(pdfBuffer);
  if (!pdfText || !pdfText.trim()) {
    throw new ExtractionError(
      "No text could be extracted from this PDF. It may be a scanned/image-only document."
    );
  }

  const prompt = strategy.buildExtractionPrompt(pdfText);

  let lastError: unknown;
  let raw: RawExtractedFields | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const responseText = await callOpenAI(prompt);
      raw = parseRawResponse(responseText);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!raw) {
    throw new ExtractionError(
      `Failed to extract fields from the document after retrying: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  const services = strategy.processServices(raw.services);
  const derived = deriveContractFields({
    signingDateRaw: raw.signingDateRaw,
    currency: raw.currency,
    invoiceDueRaw: raw.invoiceDueRaw,
    initialTermRaw: raw.initialTermRaw,
    terminationNoticeRaw: raw.terminationNoticeRaw,
    autoRenewalCycleRaw: raw.autoRenewalCycleRaw,
  });

  return {
    templateType,

    clientLegalEntityName: raw.clientLegalEntityName,
    legalEntityAddress: raw.legalEntityAddress,
    focusCorePreparer: combinePreparer(raw.focusCorePreparerName, raw.focusCorePreparerTitle),
    clientSignerName: raw.clientSignerName,

    signingDate: derived.signingDate,
    contractStartDate: derived.contractStartDate,
    initialTermEndDate: derived.initialTermEndDate,
    invoiceDueDate: derived.invoiceDueDate,
    autoRenewal: derived.autoRenewal,
    terminationNoticePeriod: derived.terminationNoticePeriod,

    invoiceDueRaw: raw.invoiceDueRaw,
    initialTermRaw: raw.initialTermRaw,
    terminationNoticeRaw: raw.terminationNoticeRaw,
    autoRenewalCycleRaw: raw.autoRenewalCycleRaw,

    contractCurrency: raw.currency,
    commercialTax: derived.commercialTax,
    stampDutyClauseApplicable: derived.stampDutyClauseApplicable,
    stampDutyFee: derived.stampDutyFee,

    services,
    additionalInvoicingDetails: EMPTY_INVOICING_DETAILS,
    specialNotes: raw.specialNotes,

    needsReview: derived.needsReview,
    reviewNotes: derived.reviewNotes,
  };
}
