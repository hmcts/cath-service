import Ajv from "ajv";
import schema from "../schemas/sjp-public-list.json" with { type: "json" };

export interface ValidationResult {
  isValid: boolean;
  errors: unknown[];
  schemaVersion: string;
}

/**
 * Validates SJP Public List JSON data
 * @param jsonData - The JSON data to validate
 * @returns ValidationResult
 */
export function validateSjpPublicList(jsonData: unknown): ValidationResult {
  const ajv = new (Ajv as any)({ allErrors: true, strict: false, validateSchema: false });
  const validate = ajv.compile(schema);
  const isValid = validate(jsonData);

  return {
    isValid,
    errors: validate.errors || [],
    schemaVersion: "1.0"
  };
}
