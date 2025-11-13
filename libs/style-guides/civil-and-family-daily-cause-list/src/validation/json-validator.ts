import Ajv from "ajv";
import schema from "../schemas/civil-and-family-daily-cause-list.json" with { type: "json" };

const SCHEMA_VERSION = "1.0";

export function validateCivilFamilyCauseList(jsonData: unknown) {
  const ajv = new (Ajv as any)({ allErrors: true, strict: false, validateSchema: false });
  const validate = ajv.compile(schema);
  const isValid = validate(jsonData);

  return {
    isValid,
    errors: validate.errors || [],
    schemaVersion: SCHEMA_VERSION
  };
}
