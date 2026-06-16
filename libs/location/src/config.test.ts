import path from "node:path";
import { describe, expect, it } from "vitest";
import * as config from "./config.js";

describe("Location Module Config", () => {
  describe("moduleRoot", () => {
    it("should export moduleRoot as a string", () => {
      expect(typeof config.moduleRoot).toBe("string");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(config.moduleRoot)).toBe(true);
    });

    it("should point to the src directory", () => {
      expect(config.moduleRoot.endsWith("src")).toBe(true);
    });

    it("should be within the location module", () => {
      expect(config.moduleRoot).toContain("location");
    });
  });
});
