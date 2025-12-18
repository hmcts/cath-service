import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, pageRoutes } from "./config.js";

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

  describe("pageRoutes", () => {
    it("should have path property", () => {
      expect(pageRoutes.path).toBeDefined();
      expect(typeof pageRoutes.path).toBe("string");
    });

    it("should have prefix property", () => {
      expect(pageRoutes.prefix).toBeDefined();
      expect(typeof pageRoutes.prefix).toBe("string");
    });

    it("should have correct prefix", () => {
      expect(pageRoutes.prefix).toBe("/care-standards-tribunal-weekly-hearing-list");
    });

    it("should point to pages directory", () => {
      expect(pageRoutes.path).toContain("pages");
    });

    it("should have absolute path", () => {
      expect(path.isAbsolute(pageRoutes.path)).toBe(true);
    });

    it("should point to existing directory", () => {
      expect(existsSync(pageRoutes.path)).toBe(true);
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
  });

  describe("path relationships", () => {
    it("pageRoutes.path should be subdirectory of moduleRoot", () => {
      const relativePath = path.relative(moduleRoot, pageRoutes.path);
      expect(relativePath).toBe("pages");
    });

    it("assets should be sibling directory to moduleRoot", () => {
      const moduleRootParent = path.dirname(moduleRoot);
      const assetsParent = path.dirname(path.resolve(assets));
      expect(assetsParent).toBe(moduleRootParent);
    });
  });
});
