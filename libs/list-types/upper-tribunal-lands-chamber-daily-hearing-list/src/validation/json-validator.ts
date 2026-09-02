import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/upper-tribunal-lands-chamber-daily-hearing-list.json" with { type: "json" };

export function validateUtLandsChamberDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
