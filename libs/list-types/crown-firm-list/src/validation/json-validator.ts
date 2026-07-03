import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/crown-firm-list.json" with { type: "json" };

export function validateCrownFirmList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
