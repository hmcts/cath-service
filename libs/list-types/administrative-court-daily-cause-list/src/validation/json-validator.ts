import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "../schemas/admin-court.json");
const schemaContent = readFileSync(schemaPath, "utf-8");
const schema = JSON.parse(schemaContent);

const ajv = new (Ajv as any)({ allErrors: true });
const validate = ajv.compile(schema);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateAdminCourt(data: unknown): ValidationResult {
  const isValid = validate(data);

  if (isValid) {
    return {
      isValid: true,
      errors: []
    };
  }

  const errors = validate.errors?.map((error: any) => {
    const field = error.instancePath.replace(/\//g, ".").substring(1) || "root";
    return `${field}: ${error.message}`;
  }) || ["Unknown validation error"];

  return {
    isValid: false,
    errors
  };
}
