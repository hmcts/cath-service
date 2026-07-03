import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("send-daily-hearing-list config", () => {
  it("should export a valid moduleRoot", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(moduleRoot).toMatch(/[/\\]/);
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export a valid assets path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
    expect(assets.endsWith("/") || assets.endsWith("\\")).toBe(true);
    expect(assets.startsWith(moduleRoot)).toBe(true);
  });

  it("should export a valid schemaPath", () => {
    expect(schemaPath).toBeDefined();
    expect(schemaPath).toContain("send-daily-hearing-list.json");
    expect(existsSync(schemaPath)).toBe(true);
  });
});
