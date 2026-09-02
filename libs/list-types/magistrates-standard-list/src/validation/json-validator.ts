import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-standard-list.json" with { type: "json" };

export function validateMagistratesStandardList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
