import type { RawExtractedFields, ServiceLine, TemplateType } from "../types";

/**
 * A template strategy encapsulates everything that varies between contract
 * templates: how the extraction prompt is built, and how raw service rows
 * are turned into "purchased" service lines.
 *
 * This template ("Myanmar Incorporation Services Proposal") has no
 * checkboxes — every row in the fees table was purchased. A future template
 * that DOES use checkboxes/marks would implement `processServices` with
 * mark-detection logic instead, without touching any other part of the app.
 */
export interface TemplateStrategy {
  id: TemplateType;
  label: string;

  /** Builds the full extraction prompt (instructions + schema) given raw PDF text. */
  buildExtractionPrompt(pdfText: string): string;

  /**
   * Turns the raw `services` array returned by the LLM into final service
   * lines, deciding which are "purchased" and flagging one-time services.
   */
  processServices(raw: RawExtractedFields["services"]): ServiceLine[];
}
