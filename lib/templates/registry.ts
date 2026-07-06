import type { TemplateStrategy } from "./types";
import { myanmarIncorporationStrategy } from "./myanmarIncorporation";

// To support a new template (e.g. one that uses checkboxes), implement a new
// TemplateStrategy and register it here — no other file needs to change.
const TEMPLATES: Record<string, TemplateStrategy> = {
  [myanmarIncorporationStrategy.id]: myanmarIncorporationStrategy,
};

export const DEFAULT_TEMPLATE_ID = myanmarIncorporationStrategy.id;

export function getTemplateStrategy(id: string = DEFAULT_TEMPLATE_ID): TemplateStrategy {
  const strategy = TEMPLATES[id];
  if (!strategy) {
    throw new Error(`Unknown template strategy: ${id}`);
  }
  return strategy;
}
