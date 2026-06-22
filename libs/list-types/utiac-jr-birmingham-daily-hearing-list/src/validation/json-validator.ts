import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/utiac-jr-birmingham-daily-hearing-list.json" with { type: "json" };

export function validateUtiacJrBirminghamDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
