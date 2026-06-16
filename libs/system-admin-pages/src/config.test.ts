import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileUploadRoutes, moduleRoot } from "./config.js";

describe("System Admin Config", () => {
  it("should export fileUploadRoutes as array", () => {
    expect(Array.isArray(fileUploadRoutes)).toBe(true);
    expect(fileUploadRoutes).toContain("/reference-data-upload");
  });

  it("should export moduleRoot path", () => {
    expect(typeof moduleRoot).toBe("string");
    expect(path.isAbsolute(moduleRoot)).toBe(true);
  });
});
