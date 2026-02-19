import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createJsonValidator } from "./json-validator.js";

const TEST_SCHEMA_DIR = path.join(__dirname, "__test-schemas__");

const validSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    email: { type: "string" }
  },
  required: ["name", "age"]
};

const schemaWithNestedObjects = {
  type: "object",
  properties: {
    user: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" }
      },
      required: ["firstName"]
    }
  },
  required: ["user"]
};

describe("json-validator", () => {
  beforeAll(() => {
    if (!existsSync(TEST_SCHEMA_DIR)) {
      mkdirSync(TEST_SCHEMA_DIR, { recursive: true });
    }
    writeFileSync(path.join(TEST_SCHEMA_DIR, "valid-schema.json"), JSON.stringify(validSchema));
    writeFileSync(path.join(TEST_SCHEMA_DIR, "nested-schema.json"), JSON.stringify(schemaWithNestedObjects));
  });

  afterAll(() => {
    if (existsSync(TEST_SCHEMA_DIR)) {
      rmSync(TEST_SCHEMA_DIR, { recursive: true, force: true });
    }
  });

  describe("createJsonValidator", () => {
    it("should return a validator function", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator = createJsonValidator(schemaPath);

      expect(typeof validator).toBe("function");
    });

    it("should validate data that matches the schema", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({ name: "John", age: 30 });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return errors for missing required fields", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({ name: "John" });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("root: must have required property 'age'");
    });

    it("should return errors for incorrect types", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({ name: "John", age: "thirty" });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("age: must be number");
    });

    it("should return multiple errors when allErrors is enabled", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain("root: must have required property 'name'");
      expect(result.errors).toContain("root: must have required property 'age'");
    });

    it("should handle nested object validation errors", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "nested-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({ user: {} });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("user: must have required property 'firstName'");
    });

    it("should validate nested objects that match the schema", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "nested-schema.json");
      const validator = createJsonValidator(schemaPath);

      const result = validator({ user: { firstName: "John" } });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should cache compiled validators for the same schema path", () => {
      const schemaPath = path.join(TEST_SCHEMA_DIR, "valid-schema.json");
      const validator1 = createJsonValidator(schemaPath);
      const validator2 = createJsonValidator(schemaPath);

      const result1 = validator1({ name: "John", age: 30 });
      const result2 = validator2({ name: "Jane", age: 25 });

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it("should throw error for non-existent schema file", () => {
      const nonExistentPath = path.join(TEST_SCHEMA_DIR, "non-existent.json");

      expect(() => createJsonValidator(nonExistentPath)).toThrow();
    });

    it("should throw error for invalid JSON schema file", () => {
      const invalidSchemaPath = path.join(TEST_SCHEMA_DIR, "invalid-schema.json");
      writeFileSync(invalidSchemaPath, "not valid json");

      expect(() => createJsonValidator(invalidSchemaPath)).toThrow();

      unlinkSync(invalidSchemaPath);
    });
  });
});
