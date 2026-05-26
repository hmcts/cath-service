import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, pageRoutes } from "./config.js";

describe("SJP Press List Config", () => {
  describe("pageRoutes", () => {
    it("should export page routes configuration", () => {
      expect(pageRoutes).toBeDefined();
      expect(pageRoutes.path).toBeDefined();
    });

    it("should have a valid path to pages directory", () => {
      expect(pageRoutes.path).toContain("pages");
      expect(typeof pageRoutes.path).toBe("string");
    });

    it("should resolve to an absolute path", () => {
      expect(path.isAbsolute(pageRoutes.path)).toBe(true);
    });
  });

  describe("assets", () => {
    it("should export assets configuration", () => {
      expect(assets).toBeDefined();
      expect(typeof assets).toBe("string");
    });

    it("should have a valid path to assets directory", () => {
      expect(assets).toContain("assets");
    });

    it("should resolve to an absolute path", () => {
      expect(path.isAbsolute(assets)).toBe(true);
    });
  });
});
