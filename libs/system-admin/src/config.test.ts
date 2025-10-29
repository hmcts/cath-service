import { describe, expect, it } from "vitest";
import { pageRoutes, assets, moduleRoot } from "./config.js";
import path from "node:path";

describe("System Admin Config", () => {
  it("should export pageRoutes with correct structure", () => {
    expect(pageRoutes).toHaveProperty("path");
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
  });

  it("should export assets path", () => {
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should export moduleRoot path", () => {
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });

  it("should have pageRoutes.path ending with pages", () => {
    expect(pageRoutes.path.endsWith("pages")).toBe(true);
  });

  it("should have assets path ending with assets/", () => {
    expect(assets.endsWith("assets/")).toBe(true);
  });

  it("should have all paths be absolute", () => {
    expect(path.isAbsolute(pageRoutes.path)).toBe(true);
    expect(path.isAbsolute(assets)).toBe(true);
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });
});
