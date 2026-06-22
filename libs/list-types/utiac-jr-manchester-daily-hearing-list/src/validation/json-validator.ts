import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/utiac-jr-manchester-daily-hearing-list.json" with { type: "json" };

export function validateUtiacJrManchesterDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
