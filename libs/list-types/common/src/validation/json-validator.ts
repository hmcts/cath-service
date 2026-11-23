import { readFileSync } from "node:fs";
import Ajv from "ajv";

const ajv = new (Ajv as any)({ allErrors: true });
const compiledValidators = new Map<string, any>();

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
      return { isValid: true, errors: [], issues: [] };
    }

    const errors = validate.errors?.map((error: any) => {
      const field = error.instancePath.replace(/\//g, ".").substring(1) || "root";
      return `${field}: ${error.message}`;
    }) || ["Unknown validation error"];

    const issues: ValidationIssue[] = (validate.errors ?? []).map((error: any) => ({
      instancePath: error.instancePath,
      keyword: error.keyword,
      params: error.params ?? {},
      message: error.message ?? ""
    }));

    return { isValid: false, errors, issues };
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  /** Structured AJV errors, used to locate schema errors in non-strategic Excel uploads */
  issues?: ValidationIssue[];
}

export interface ValidationIssue {
  instancePath: string;
  keyword: string;
  params: Record<string, unknown>;
  message: string;
}
