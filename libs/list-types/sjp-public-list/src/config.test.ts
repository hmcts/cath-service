import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot } from "./config.js";

describe("SJP Public List Config", () => {
  describe("moduleRoot", () => {
    it("should export module root", () => {
      expect(moduleRoot).toBeDefined();
      expect(typeof moduleRoot).toBe("string");
    });

    it("should resolve to an absolute path", () => {
      expect(path.isAbsolute(moduleRoot)).toBe(true);
    });
  });

  describe("assets", () => {
    it("should export assets path", () => {
      expect(assets).toBeDefined();
      expect(typeof assets).toBe("string");
    });

    it("should resolve to an absolute path", () => {
      expect(path.isAbsolute(assets)).toBe(true);
    });
  });
});
