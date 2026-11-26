import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/cop-daily-cause-list.json" with { type: "json" };

/**
 * Validates Court of Protection Daily Cause List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateCopDailyCauseList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
