import type { TemplateStrategy } from "./types";
import { buildStandardPrompt, processStandardServices } from "./promptShared";

export const incorporationStrategy: TemplateStrategy = {
  id: "incorporation",
  label: "Incorporation",
  buildExtractionPrompt: (pdfText) =>
    buildStandardPrompt(pdfText, "Myanmar Incorporation Services Proposal"),
  processServices: processStandardServices,
};
