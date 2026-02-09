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

    it("should return array with subscription, subscriptions, subscription-list-types, location, notifications, and list-search-config schemas", () => {
      const result = getPrismaSchemas();
      expect(result.length).toBe(6);
      expect(result.some((path) => path.includes("libs/subscription/prisma"))).toBe(true);
      expect(result.some((path) => path.includes("subscriptions"))).toBe(true);
      expect(result.some((path) => path.includes("subscription-list-types"))).toBe(true);
      expect(result.some((path) => path.includes("location"))).toBe(true);
      expect(result.some((path) => path.includes("notifications"))).toBe(true);
      expect(result.some((path) => path.includes("list-search-config"))).toBe(true);
    });

    it("should return a new array on each call", () => {
      const result1 = getPrismaSchemas();
      const result2 = getPrismaSchemas();
      expect(result1).not.toBe(result2);
    });
  });
});
