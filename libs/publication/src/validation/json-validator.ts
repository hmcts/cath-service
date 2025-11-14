import Ajv from "ajv";

export interface ValidationResult {
  isValid: boolean;
  errors: unknown[];
  schemaVersion: string;
}

/**
 * Generic JSON validator that validates data against a JSON schema
 * Can be used by any list type to validate their JSON data
 *
 * @param jsonData - The JSON data to validate
 * @param schema - The JSON schema to validate against
 * @param schemaVersion - Version of the schema being used
 * @returns ValidationResult with isValid flag, errors array, and schema version
 *
 * @example
 * ```typescript
 * import schema from "./my-schema.json" with { type: "json" };
 * const result = validateJson(jsonData, schema, "1.0");
 * if (!result.isValid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateJson(jsonData: unknown, schema: object, schemaVersion: string): ValidationResult {
  const ajv = new (Ajv as any)({ allErrors: true, strict: false, validateSchema: false });
  const validate = ajv.compile(schema);
  const isValid = validate(jsonData);

  return {
    isValid,
    errors: validate.errors || [],
    schemaVersion
  };
}
