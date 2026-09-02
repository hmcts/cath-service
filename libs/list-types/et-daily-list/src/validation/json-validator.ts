import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/et-daily-list.json" with { type: "json" };

/**
 * Validates Employment Tribunals Daily List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateEtDailyList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
