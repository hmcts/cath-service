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

    it("should return array with subscriptions, location, and sjp schemas", () => {
      const result = getPrismaSchemas();
      expect(result.length).toBe(3);
      expect(result[0]).toContain("subscriptions");
      expect(result[1]).toContain("location");
      expect(result[2]).toContain("sjp");
    });

    it("should return a new array on each call", () => {
      const result1 = getPrismaSchemas();
      const result2 = getPrismaSchemas();
      expect(result1).not.toBe(result2);
    });
  });
});
