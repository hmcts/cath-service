import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { londonSchemaPath } from "../config.js";

export function validateUtiacJrLondonDailyHearingList(jsonData: unknown): ValidationResult {
  return createJsonValidator(londonSchemaPath)(jsonData);
}
