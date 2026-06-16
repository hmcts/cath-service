import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/send-daily-hearing-list-schema.json" with { type: "json" };

export function validateSendDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
