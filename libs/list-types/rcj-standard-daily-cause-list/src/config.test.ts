import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moduleRoot } from "./config.js";

describe("config", () => {
  it("should export moduleRoot as a valid directory path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(existsSync(moduleRoot)).toBe(true);
  });
});
