import { describe, expect, it } from "vitest";
import { validateJson } from "./json-validator.js";

describe("validateJson", () => {
  describe("valid data", () => {
    it("should validate correct data against a simple schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "age"]
      };

      const validData = {
        name: "John Doe",
        age: 30
      };

      const result = validateJson(validData, schema, "1.0");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schemaVersion).toBe("1.0");
    });

    it("should validate nested object structures", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                  postCode: { type: "string" }
                },
                required: ["street", "postCode"]
              }
            },
            required: ["name", "address"]
          }
        },
        required: ["user"]
      };

      const validData = {
        user: {
          name: "Jane Smith",
          address: {
            street: "123 Main St",
            postCode: "AB1 2CD"
          }
        }
      };

      const result = validateJson(validData, schema, "2.0");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schemaVersion).toBe("2.0");
    });

    it("should validate arrays with specific item schemas", () => {
      const schema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                name: { type: "string" }
              },
              required: ["id", "name"]
            }
          }
        },
        required: ["items"]
      };

      const validData = {
        items: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" }
        ]
      };

      const result = validateJson(validData, schema, "1.5");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schemaVersion).toBe("1.5");
    });
  });

  describe("invalid data", () => {
    it("should return errors for missing required fields", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "age"]
      };

      const invalidData = {
        name: "John Doe"
      };

      const result = validateJson(invalidData, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.schemaVersion).toBe("1.0");
    });

    it("should return errors for wrong data types", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "age"]
      };

      const invalidData = {
        name: "John Doe",
        age: "thirty"
      };

      const result = validateJson(invalidData, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return multiple errors when multiple fields are invalid", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          email: { type: "string", format: "email" }
        },
        required: ["name", "age", "email"]
      };

      const invalidData = {
        age: "not a number"
      };

      const result = validateJson(invalidData, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("should return errors for invalid nested structures", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" }
            },
            required: ["name", "age"]
          }
        },
        required: ["user"]
      };

      const invalidData = {
        user: {
          name: "Jane"
        }
      };

      const result = validateJson(invalidData, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return errors for invalid array items", () => {
      const schema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" }
              },
              required: ["id"]
            }
          }
        },
        required: ["items"]
      };

      const invalidData = {
        items: [{ id: 1 }, { name: "Missing id" }]
      };

      const result = validateJson(invalidData, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null data", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      };

      const result = validateJson(null, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle undefined data", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      };

      const result = validateJson(undefined, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle empty object when required fields are specified", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      };

      const result = validateJson({}, schema, "1.0");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle empty object when no required fields", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" }
        }
      };

      const result = validateJson({}, schema, "1.0");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("schema version", () => {
    it("should return the correct schema version in the result", () => {
      const schema = {
        type: "object",
        properties: {
          value: { type: "string" }
        }
      };

      const result = validateJson({ value: "test" }, schema, "3.2.1");

      expect(result.schemaVersion).toBe("3.2.1");
    });

    it("should return schema version even when validation fails", () => {
      const schema = {
        type: "object",
        properties: {
          value: { type: "number" }
        },
        required: ["value"]
      };

      const result = validateJson({}, schema, "2.5.0");

      expect(result.isValid).toBe(false);
      expect(result.schemaVersion).toBe("2.5.0");
    });
  });
});
