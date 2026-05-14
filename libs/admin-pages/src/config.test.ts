import path from "node:path";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot } from "./config.js";

describe("admin-pages module exports", () => {
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

  it("should have assets path relative to moduleRoot", () => {
    expect(assets).toContain(moduleRoot);
  });
});
