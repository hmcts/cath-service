import path from "node:path";
import { describe, expect, it } from "vitest";
import { apiRoutes, moduleRoot } from "./config.js";

describe("public-pages module exports", () => {
  it("should export apiRoutes with correct path", () => {
    expect(apiRoutes).toBeDefined();
    expect(apiRoutes.path).toBeDefined();
    expect(typeof apiRoutes.path).toBe("string");
    expect(apiRoutes.path).toContain("routes");
  });

  it("should export moduleRoot path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });

  it("should have apiRoutes.path relative to moduleRoot", () => {
    expect(apiRoutes.path).toContain(moduleRoot);
  });
});
