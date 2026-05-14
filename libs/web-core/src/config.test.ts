import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot } from "./config.js";

describe("Web Core Config", () => {
  describe("moduleRoot", () => {
    it("should export moduleRoot as string", () => {
      expect(moduleRoot).toBeDefined();
      expect(typeof moduleRoot).toBe("string");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(moduleRoot)).toBe(true);
    });

    it("should exist and be a valid directory path", () => {
      expect(moduleRoot.length).toBeGreaterThan(0);
    });
  });

  describe("assets", () => {
    it("should export assets path", () => {
      expect(assets).toBeDefined();
      expect(typeof assets).toBe("string");
    });

    it("should point to assets directory", () => {
      expect(assets).toContain("assets");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(assets)).toBe(true);
    });

    it("should be relative to moduleRoot", () => {
      expect(assets.startsWith(moduleRoot)).toBe(true);
    });
  });
});
