import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/sjp-press-list.json" with { type: "json" };

/**
 * Validates SJP Press List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateSjpPressList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
