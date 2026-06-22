import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateWpafccWeeklyHearingList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
