import path from "node:path";
import { describe, expect, it } from "vitest";
import * as config from "./config.js";

describe("List Search Config Module Config", () => {
  describe("prismaSchemas", () => {
    it("should export prismaSchemas as a string", () => {
      expect(typeof config.prismaSchemas).toBe("string");
    });

    it("should point to the prisma directory", () => {
      expect(config.prismaSchemas).toContain("prisma");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(config.prismaSchemas)).toBe(true);
    });

    it("should end with prisma directory", () => {
      expect(config.prismaSchemas.endsWith("prisma")).toBe(true);
    });

    it("should be within the list-search-config module", () => {
      expect(config.prismaSchemas).toContain("list-search-config");
    });

    it("should exist as a resolvable path", () => {
      // The path should be constructible from __dirname and ../prisma
      const expectedPath = path.join(path.dirname(import.meta.url.replace("file://", "")), "../prisma");
      expect(path.normalize(config.prismaSchemas)).toBe(path.normalize(expectedPath));
    });
  });
});
