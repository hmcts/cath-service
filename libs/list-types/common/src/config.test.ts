import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { moduleRoot } from "./config.js";

describe("config", () => {
  it("should export moduleRoot with correct path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
  });

  it("should have moduleRoot pointing to src directory", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    expect(moduleRoot).toBe(__dirname);
  });
});
