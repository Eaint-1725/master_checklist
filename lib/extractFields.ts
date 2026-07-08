import OpenAI from "openai";
import { extractPdfText } from "./pdfText";
import { getTemplateStrategy, DEFAULT_TEMPLATE_ID } from "./templates/registry";
import { deriveContractFields } from "./deriveFields";
import type { AdditionalInvoicingDetails, ExtractedFields, RawExtractedFields } from "./types";

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
    proposalIssueDateRaw: (obj.proposalIssueDateRaw as string) ?? null,
    currency: (obj.currency as "USD" | "MMK") ?? null,
    services: Array.isArray(obj.services) ? (obj.services as RawExtractedFields["services"]) : [],
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
  templateId: string = DEFAULT_TEMPLATE_ID
): Promise<ExtractedFields> {
  const strategy = getTemplateStrategy(templateId);
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
    proposalIssueDateRaw: raw.proposalIssueDateRaw,
    currency: raw.currency,
  });

  return {
    clientLegalEntityName: raw.clientLegalEntityName,
    legalEntityAddress: raw.legalEntityAddress,
    focusCorePreparer: combinePreparer(raw.focusCorePreparerName, raw.focusCorePreparerTitle),
    clientSignerName: raw.clientSignerName,

    signingDate: derived.signingDate,
    proposalIssueDate: derived.proposalIssueDate,
    contractStartDate: derived.contractStartDate,
    initialTermEndDate: derived.initialTermEndDate,
    invoiceDueDate: derived.invoiceDueDate,
    autoRenewal: derived.autoRenewal,
    terminationNoticePeriod: derived.terminationNoticePeriod,

    contractCurrency: raw.currency,
    commercialTax: derived.commercialTax,
    stampDutyClauseApplicable: derived.stampDutyClauseApplicable,

    services,
    additionalInvoicingDetails: EMPTY_INVOICING_DETAILS,

    needsReview: derived.needsReview,
    reviewNotes: derived.reviewNotes,
  };
}
