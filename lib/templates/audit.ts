import type { TemplateStrategy } from "./types";
import { buildStandardPrompt, processStandardServices } from "./promptShared";

export const auditStrategy: TemplateStrategy = {
  id: "audit",
  label: "Audit",
  buildExtractionPrompt: (pdfText) => buildStandardPrompt(pdfText, "Audit Services Proposal"),
  processServices: processStandardServices,
};
