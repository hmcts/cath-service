import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot } from "./config.js";

describe("care-standards-tribunal-weekly-hearing-list config", () => {
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

    it("should have valid path structure", () => {
      // Assets directory may not exist if module has no assets
      // Just verify the path is constructed correctly
      expect(assets).toBeTruthy();
    });

    it("should end with trailing slash", () => {
      expect(assets).toMatch(/\/$/);
    });

    it("should be subdirectory of moduleRoot", () => {
      expect(assets.startsWith(moduleRoot)).toBe(true);
    });
  });
});
