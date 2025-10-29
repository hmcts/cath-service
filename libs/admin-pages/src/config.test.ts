import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, pageRoutes } from "./config.js";

describe("admin-pages module exports", () => {
  it("should export pageRoutes with correct path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes.path).toBeDefined();
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
  });

  it("should export assets path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should export moduleRoot path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });

  it("should have pageRoutes.path relative to moduleRoot", () => {
    expect(pageRoutes.path).toContain(moduleRoot);
  });

  it("should have assets path relative to moduleRoot", () => {
    expect(assets).toContain(moduleRoot);
  });
});
