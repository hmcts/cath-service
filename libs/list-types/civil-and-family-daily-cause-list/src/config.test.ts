import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assets, moduleRoot, pageRoutes } from "./config.js";

describe("config", () => {
  it("should export pageRoutes with correct path", () => {
    expect(pageRoutes).toBeDefined();
    expect(pageRoutes).toHaveProperty("path");
    expect(typeof pageRoutes.path).toBe("string");
    expect(pageRoutes.path).toContain("pages");
  });

  it("should export moduleRoot with correct path", () => {
    expect(moduleRoot).toBeDefined();
    expect(typeof moduleRoot).toBe("string");
  });

  it("should export assets with correct path", () => {
    expect(assets).toBeDefined();
    expect(typeof assets).toBe("string");
    expect(assets).toContain("assets");
  });

  it("should have pageRoutes path pointing to existing directory structure", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const expectedPath = path.join(__dirname, "pages");
    expect(pageRoutes.path).toBe(expectedPath);
  });

  it("should have assets path as sibling to src", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const expectedPath = path.join(__dirname, "../assets/");
    expect(assets).toBe(expectedPath);
  });

  it("should have moduleRoot pointing to src directory", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    expect(moduleRoot).toBe(__dirname);
  });
});
