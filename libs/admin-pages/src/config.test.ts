import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleRoot } from "./config.js";

describe("admin-pages module exports", () => {
  it("should export moduleRoot path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });
});
