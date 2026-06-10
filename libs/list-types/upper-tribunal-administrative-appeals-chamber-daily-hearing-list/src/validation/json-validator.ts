import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/upper-tribunal-administrative-appeals-chamber-daily-hearing-list.json" with { type: "json" };

export function validateUtAdministrativeAppealsChamberDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
