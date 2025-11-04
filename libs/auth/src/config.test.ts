import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleRoot, pageRoutes } from "./config.js";

describe("auth config", () => {
  it("should export pageRoutes with correct path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes.path).toBeDefined();
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
  });

  it("should export moduleRoot", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });

  it("should have pageRoutes.path as subdirectory of moduleRoot", () => {
    expect(pageRoutes.path).toContain(moduleRoot);
  });

  it("should point to pages directory within auth module", () => {
    expect(pageRoutes.path.endsWith("pages")).toBe(true);
  });
});
