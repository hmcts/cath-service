import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("config", () => {
  it("should export moduleRoot as a valid directory path", () => {
    expect(moduleRoot).toBeDefined();
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export assets as a subdirectory of moduleRoot", () => {
    expect(assets.startsWith(moduleRoot)).toBe(true);
    expect(assets).toContain("assets");
  });

  it("should export schemaPath pointing at the schema JSON", () => {
    expect(schemaPath).toContain("business-and-property-division-rolls-building-daily-cause-list.json");
    expect(existsSync(schemaPath)).toBe(true);
  });
});
