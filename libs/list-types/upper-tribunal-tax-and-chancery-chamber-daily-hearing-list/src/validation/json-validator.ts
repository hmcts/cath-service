import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.json" with { type: "json" };

export function validateUtTaxAndChanceryChamberDailyHearingList(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
