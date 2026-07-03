import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/crown-warned-list.json" with { type: "json" };

export function validateCrownWarnedList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
