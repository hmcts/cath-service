import path from "node:path";
import { describe, expect, it } from "vitest";
import { apiRoutes } from "./config.js";

describe("config", () => {
  describe("apiRoutes", () => {
    it("should export apiRoutes object", () => {
      expect(apiRoutes).toBeDefined();
      expect(apiRoutes).toHaveProperty("path");
    });

    it("should have a valid path property", () => {
      expect(apiRoutes.path).toBeDefined();
      expect(typeof apiRoutes.path).toBe("string");
      expect(apiRoutes.path.length).toBeGreaterThan(0);
    });

    it("should resolve to the routes directory", () => {
      expect(apiRoutes.path).toContain("routes");
      expect(path.isAbsolute(apiRoutes.path)).toBe(true);
    });

    it("should point to an existing directory structure", () => {
      const pathSegments = apiRoutes.path.split(path.sep);
      expect(pathSegments).toContain("routes");
    });
  });
});
