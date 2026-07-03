import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { londonSchemaPath, schemaPath } from "../config.js";

export function validateUtiacJrDailyHearingList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}

export function validateUtiacJrAnyDailyHearingList(jsonData: unknown): ValidationResult {
  const regional = createJsonValidator(schemaPath)(jsonData);
  if (regional.isValid) return regional;
  return createJsonValidator(londonSchemaPath)(jsonData);
}
