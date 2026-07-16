import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("config", () => {
  it("should export moduleRoot pointing to src directory", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    expect(moduleRoot).toBe(__dirname);
  });

  it("should export assets as sibling to src", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    expect(assets).toBe(path.join(__dirname, "../assets/"));
  });

  it("should export schemaPath pointing to the et-daily-list schema", () => {
    expect(schemaPath).toContain("schemas/et-daily-list.json");
  });
});
