import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/utiac-jr-leeds-daily-hearing-list.json" with { type: "json" };

export function validateUtiacJrLeedsDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
