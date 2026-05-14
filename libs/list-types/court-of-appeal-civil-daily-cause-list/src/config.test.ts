import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot } from "./config.js";

describe("config", () => {
  it("should export moduleRoot as a valid directory path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export assets as a valid directory path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should have assets path as a subdirectory of moduleRoot", () => {
    expect(assets.startsWith(moduleRoot)).toBe(true);
  });
});
