import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("config", () => {
  it("should export moduleRoot as a valid directory path", () => {
    expect(existsSync(moduleRoot)).toBe(true);
  });

  it("should export assets as a subdirectory of moduleRoot", () => {
    expect(assets.startsWith(moduleRoot)).toBe(true);
  });

  it("should export schemaPath pointing at the schema JSON", () => {
    expect(schemaPath).toContain("interim-applications-daily-cause-list.json");
    expect(existsSync(schemaPath)).toBe(true);
  });
});
