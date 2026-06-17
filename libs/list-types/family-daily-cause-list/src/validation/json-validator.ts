import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/family-daily-cause-list.json" with { type: "json" };

export function validateFamilyDailyCauseList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
