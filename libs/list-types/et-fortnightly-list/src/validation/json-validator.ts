import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/et-fortnightly-press-list.json" with { type: "json" };

/**
 * Validates Employment Tribunals Fortnightly Press List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateEtFortnightlyPressList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
