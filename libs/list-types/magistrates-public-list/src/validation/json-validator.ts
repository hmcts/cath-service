import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-public-list.json" with { type: "json" };

export function validateMagistratesPublicList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
