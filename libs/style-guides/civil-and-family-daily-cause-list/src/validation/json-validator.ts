import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/civil-and-family-daily-cause-list.json" with { type: "json" };

/**
 * Validates Civil and Family Daily Cause List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateCivilFamilyCauseList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
