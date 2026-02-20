import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, pageRoutes } from "./config.js";

describe("config", () => {
  it("should export moduleRoot as a valid directory path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export pageRoutes with a valid path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes.path).toBeDefined();
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
    expect(existsSync(pageRoutes.path)).toBe(true);
  });

  it("should export assets as a valid directory path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should have pageRoutes.path as a subdirectory of moduleRoot", () => {
    expect(pageRoutes.path.startsWith(moduleRoot)).toBe(true);
  });

  it("should have assets path as a subdirectory of moduleRoot", () => {
    expect(assets.startsWith(moduleRoot)).toBe(true);
  });
});
