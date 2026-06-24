import { type ValidationResult, validateJson } from "@hmcts/publication";
import schema from "../schemas/magistrates-adult-court-list-future.json" with { type: "json" };

export function validateMagistratesAdultCourtListFuture(jsonData: unknown): ValidationResult {
  return validateJson(jsonData, schema, "1.0");
}
