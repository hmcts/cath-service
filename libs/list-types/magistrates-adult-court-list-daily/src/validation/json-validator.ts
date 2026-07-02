import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-adult-court-list-daily.json" with { type: "json" };

export function validateMagistratesAdultCourtListDaily(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
