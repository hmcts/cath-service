import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/civil-daily-cause-list.json" with { type: "json" };

export function validateCivilDailyCauseList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
