import type { TemplateStrategy } from "./types";
import type { TemplateType } from "../types";
import { incorporationStrategy } from "./incorporation";
import { visaStayPermitStrategy } from "./visaStayPermit";
import { taxComplianceStrategy } from "./taxCompliance";
import { auditStrategy } from "./audit";

// To support a new template, implement a new TemplateStrategy and register
// it here — no other file needs to change (other than adding the id to
// TemplateType and its classification rule in classifyServicesAndTerm.ts).
const TEMPLATES: Record<TemplateType, TemplateStrategy> = {
  incorporation: incorporationStrategy,
  "visa-stay-permit": visaStayPermitStrategy,
  "tax-compliance": taxComplianceStrategy,
  audit: auditStrategy,
};

export const DEFAULT_TEMPLATE_TYPE: TemplateType = "incorporation";

export function getTemplateStrategy(type: TemplateType = DEFAULT_TEMPLATE_TYPE): TemplateStrategy {
  return TEMPLATES[type];
}

export function isTemplateType(value: unknown): value is TemplateType {
  return typeof value === "string" && value in TEMPLATES;
}

/** Drives the "Template Type" dropdown on the upload screen. */
export const TEMPLATE_OPTIONS: { value: TemplateType; label: string }[] = [
  incorporationStrategy,
  visaStayPermitStrategy,
  taxComplianceStrategy,
  auditStrategy,
].map((s) => ({ value: s.id, label: s.label }));
