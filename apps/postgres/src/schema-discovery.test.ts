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

    it("should return an empty array", () => {
      const result = getPrismaSchemas();
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it("should return a new array on each call", () => {
      const result1 = getPrismaSchemas();
      const result2 = getPrismaSchemas();
      expect(result1).not.toBe(result2);
    });
  });
});
