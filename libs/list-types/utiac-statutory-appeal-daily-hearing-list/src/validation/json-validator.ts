import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/utiac-statutory-appeal-daily-hearing-list.json" with { type: "json" };

export function validateUtiacStatutoryAppealDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
