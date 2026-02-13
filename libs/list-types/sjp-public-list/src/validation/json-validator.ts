import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/sjp-public-list.json" with { type: "json" };

/**
 * Validates SJP Public List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateSjpPublicList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
