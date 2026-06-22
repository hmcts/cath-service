import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

const validate = createJsonValidator(schemaPath);

export function validateWpafccWeeklyHearingList(jsonData: unknown): ValidationResult {
  return validate(jsonData);
}
