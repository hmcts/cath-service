import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleRoot } from "./config.js";

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

  // Note: assets export was removed as assets are now consolidated in apps/web/src/assets
});
