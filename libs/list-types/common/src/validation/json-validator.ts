import { readFileSync } from "node:fs";
import Ajv from "ajv";

const ajv = new (Ajv as any)({ allErrors: true });
const compiledValidators = new Map<string, any>();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function createJsonValidator(schemaPath: string): (data: unknown) => ValidationResult {
  let validate = compiledValidators.get(schemaPath);

  if (!validate) {
    const schemaContent = readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);
    validate = ajv.compile(schema);
    compiledValidators.set(schemaPath, validate);
  }

  return (data: unknown): ValidationResult => {
    const isValid = validate(data);

    if (isValid) {
      return { isValid: true, errors: [] };
    }

    const errors = validate.errors?.map((error: any) => {
      const field = error.instancePath.replace(/\//g, ".").substring(1) || "root";
      return `${field}: ${error.message}`;
    }) || ["Unknown validation error"];

    return { isValid: false, errors };
  };
}
