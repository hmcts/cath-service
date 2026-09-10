import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/crown-advanced-pdda-list.json" with { type: "json" };

export function validateCrownAdvanceList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
