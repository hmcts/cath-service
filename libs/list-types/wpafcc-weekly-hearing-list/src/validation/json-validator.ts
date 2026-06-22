import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/wpafcc-weekly-hearing-list.json" with { type: "json" };

export function validateWpafccWeeklyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
