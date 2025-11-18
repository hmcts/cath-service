import { describe, expect, it } from "vitest";
import { getPrismaSchemas } from "./schema-discovery.js";

describe("Schema Discovery", () => {
  describe("getPrismaSchemas", () => {
    it("should be a function", () => {
      expect(typeof getPrismaSchemas).toBe("function");
    });

    it("should return an array", () => {
      const result = getPrismaSchemas();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return schema paths", () => {
      const result = getPrismaSchemas();
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.every((path) => typeof path === "string")).toBe(true);
    });

    it("should return a new array on each call", () => {
      const result1 = getPrismaSchemas();
      const result2 = getPrismaSchemas();
      expect(result1).not.toBe(result2);
    });
  });
});
