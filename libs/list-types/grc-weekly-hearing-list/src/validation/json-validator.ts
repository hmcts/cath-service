import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/grc-weekly-hearing-list.json" with { type: "json" };

export function validateGrcWeeklyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
