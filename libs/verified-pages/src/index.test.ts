import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, pageRoutes } from "./index.js";

describe("verified-pages module exports", () => {
  it("should export pageRoutes with valid path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes).toHaveProperty("path");
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
    expect(existsSync(pageRoutes.path)).toBe(true);
  });

  it("should export moduleRoot as valid directory", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export assets path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
    expect(existsSync(assets)).toBe(true);
  });

  it("should have assets path ending with trailing slash", () => {
    expect(assets).toMatch(/\/$/);
  });

  it("should have all paths as absolute paths", () => {
    expect(pageRoutes.path).toMatch(/^\//);
    expect(moduleRoot).toMatch(/^\//);
    expect(assets).toMatch(/^\//);
  });
});
