import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/pht-weekly-hearing-list.json" with { type: "json" };

export function validatePhtWeeklyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
