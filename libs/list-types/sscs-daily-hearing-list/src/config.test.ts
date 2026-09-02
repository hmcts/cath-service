import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("sscs-daily-hearing-list config", () => {
  describe("moduleRoot", () => {
    it("should be defined", () => {
      expect(moduleRoot).toBeDefined();
      expect(typeof moduleRoot).toBe("string");
    });

    it("should point to an existing directory", () => {
      expect(existsSync(moduleRoot)).toBe(true);
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(moduleRoot)).toBe(true);
    });
  });

  describe("schemaPath", () => {
    it("should be defined", () => {
      expect(schemaPath).toBeDefined();
      expect(typeof schemaPath).toBe("string");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(schemaPath)).toBe(true);
    });

    it("should point to the schema file", () => {
      expect(schemaPath).toContain("sscs-daily-hearing-list.json");
    });

    it("should be a subdirectory of moduleRoot", () => {
      expect(schemaPath.startsWith(moduleRoot)).toBe(true);
    });
  });

  describe("assets", () => {
    it("should be defined", () => {
      expect(assets).toBeDefined();
      expect(typeof assets).toBe("string");
    });

    it("should point to assets directory", () => {
      expect(assets).toContain("assets");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(assets)).toBe(true);
    });

    it("should end with trailing slash", () => {
      expect(assets).toMatch(/\/$/);
    });
  });

  describe("path relationships", () => {
    it("assets should be subdirectory of moduleRoot", () => {
      expect(assets.startsWith(moduleRoot)).toBe(true);
    });
  });
});
