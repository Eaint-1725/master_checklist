import type { TemplateStrategy } from "./types";
import { buildStandardPrompt, processStandardServices } from "./promptShared";

export const visaStayPermitStrategy: TemplateStrategy = {
  id: "visa-stay-permit",
  label: "Visa Stay Permit",
  buildExtractionPrompt: (pdfText) =>
    buildStandardPrompt(pdfText, "Visa Stay Permit Services Proposal"),
  processServices: processStandardServices,
};
