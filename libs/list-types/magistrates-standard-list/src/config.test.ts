import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, schemaPath } from "./config.js";

describe("config", () => {
  it("should export moduleRoot pointing to the src directory", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    expect(moduleRoot).toBe(__dirname);
  });

  it("should export assets as a sibling assets/ path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should export schemaPath pointing to the JSON schema", () => {
    expect(schemaPath).toBeDefined();
    expect(typeof schemaPath).toBe("string");
    expect(schemaPath).toContain("magistrates-standard-list.json");
  });
});
