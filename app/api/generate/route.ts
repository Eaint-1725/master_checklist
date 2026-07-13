import { NextRequest, NextResponse } from "next/server";
import { getTemplateStrategy, isTemplateType } from "@/lib/templates/registry";
import { deriveContractFields } from "@/lib/deriveFields";
import { generateExcelChecklist, buildFilename } from "@/lib/excelGenerator";
import type { AdditionalInvoicingDetails, ExtractedFields, TemplateType } from "@/lib/types";

export const runtime = "nodejs";

interface GenerateRequestBody {
  templateType: TemplateType;
  clientLegalEntityName: string | null;
  legalEntityAddress: string | null;
  focusCorePreparer: string | null;
  clientSignerName: string | null;
  signingDateRaw: string | null;
  currency: "USD" | "MMK" | null;
  invoiceDueRaw: string | null;
  initialTermRaw: string | null;
  terminationNoticeRaw: string | null;
  autoRenewalCycleRaw: string | null;
  services: { name: string; amount: number; currency: string }[];
  additionalInvoicingDetails: AdditionalInvoicingDetails;
  specialNotes?: string[];
}

function isValidBody(body: unknown): body is GenerateRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    isTemplateType(b.templateType) &&
    Array.isArray(b.services) &&
    typeof b.additionalInvoicingDetails === "object" &&
    b.additionalInvoicingDetails !== null
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error:
          "Request body is missing required fields (templateType, services, additionalInvoicingDetails).",
      },
      { status: 400 }
    );
  }

  try {
    // Recompute derived fields and service classification server-side —
    // authoritative, so any edits made on the review screen (e.g. a
    // corrected Signing Date, or a renamed service) are reflected correctly
    // rather than trusting whatever the client last displayed.
    const strategy = getTemplateStrategy(body.templateType);
    const services = strategy.processServices(body.services);
    const derived = deriveContractFields({
      signingDateRaw: body.signingDateRaw,
      currency: body.currency,
      invoiceDueRaw: body.invoiceDueRaw,
      initialTermRaw: body.initialTermRaw,
      terminationNoticeRaw: body.terminationNoticeRaw,
      autoRenewalCycleRaw: body.autoRenewalCycleRaw,
    });

    const extracted: ExtractedFields = {
      templateType: body.templateType,

      clientLegalEntityName: body.clientLegalEntityName,
      legalEntityAddress: body.legalEntityAddress,
      focusCorePreparer: body.focusCorePreparer,
      clientSignerName: body.clientSignerName,

      signingDate: derived.signingDate,
      contractStartDate: derived.contractStartDate,
      initialTermEndDate: derived.initialTermEndDate,
      invoiceDueDate: derived.invoiceDueDate,
      autoRenewal: derived.autoRenewal,
      terminationNoticePeriod: derived.terminationNoticePeriod,

      invoiceDueRaw: body.invoiceDueRaw,
      initialTermRaw: body.initialTermRaw,
      terminationNoticeRaw: body.terminationNoticeRaw,
      autoRenewalCycleRaw: body.autoRenewalCycleRaw,

      contractCurrency: body.currency,
      commercialTax: derived.commercialTax,
      stampDutyClauseApplicable: derived.stampDutyClauseApplicable,
      stampDutyFee: derived.stampDutyFee,

      services,
      additionalInvoicingDetails: body.additionalInvoicingDetails,
      specialNotes: Array.isArray(body.specialNotes)
        ? body.specialNotes.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [],

      needsReview: derived.needsReview,
      reviewNotes: derived.reviewNotes,
    };

    const excelBuffer = await generateExcelChecklist(extracted);
    const filename = buildFilename(extracted);

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate the Excel checklist.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
