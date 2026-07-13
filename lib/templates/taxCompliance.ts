import type { TemplateStrategy } from "./types";
import { buildStandardPrompt, processStandardServices } from "./promptShared";

export const taxComplianceStrategy: TemplateStrategy = {
  id: "tax-compliance",
  label: "Tax Compliance",
  buildExtractionPrompt: (pdfText) =>
    buildStandardPrompt(pdfText, "Tax Compliance Services Proposal"),
  processServices: processStandardServices,
};
