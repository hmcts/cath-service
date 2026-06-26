import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-public-adult-court-list-daily.json" with { type: "json" };

export function validateMagistratesPublicAdultCourtListDaily(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
