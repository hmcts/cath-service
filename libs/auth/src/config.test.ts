import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleRoot, pageRoutes } from "./config.js";

describe("auth config module exports", () => {
  it("should export pageRoutes with correct path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes.path).toBeDefined();
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
  });

  it("should export moduleRoot path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });

  it("should have pageRoutes.path relative to moduleRoot", () => {
    expect(pageRoutes.path).toContain(moduleRoot);
  });

  it("should have pageRoutes.path pointing to pages directory", () => {
    expect(path.basename(pageRoutes.path)).toBe("pages");
  });

  it("should have moduleRoot pointing to src directory", () => {
    expect(path.basename(moduleRoot)).toBe("src");
  });
});
