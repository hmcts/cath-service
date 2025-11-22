import path from "node:path";
import { describe, expect, it } from "vitest";
import * as config from "./config.js";

describe("Location Module Config", () => {
  describe("prismaSchemas", () => {
    it("should export prismaSchemas as a string", () => {
      expect(typeof config.prismaSchemas).toBe("string");
    });

    it("should point to the prisma directory", () => {
      expect(config.prismaSchemas).toContain("prisma");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(config.prismaSchemas)).toBe(true);
    });

    it("should end with prisma directory", () => {
      expect(config.prismaSchemas.endsWith("prisma")).toBe(true);
    });

    it("should be within the location module", () => {
      expect(config.prismaSchemas).toContain("location");
    });
  });

  describe("moduleRoot", () => {
    it("should export moduleRoot as a string", () => {
      expect(typeof config.moduleRoot).toBe("string");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(config.moduleRoot)).toBe(true);
    });

    it("should point to the src directory", () => {
      expect(config.moduleRoot.endsWith("src")).toBe(true);
    });

    it("should be within the location module", () => {
      expect(config.moduleRoot).toContain("location");
    });
  });

  describe("apiRoutes", () => {
    it("should export apiRoutes as an object", () => {
      expect(typeof config.apiRoutes).toBe("object");
      expect(config.apiRoutes).not.toBeNull();
    });

    it("should have a path property", () => {
      expect(config.apiRoutes).toHaveProperty("path");
    });

    it("should have path as a string", () => {
      expect(typeof config.apiRoutes.path).toBe("string");
    });

    it("should point to the routes directory", () => {
      expect(config.apiRoutes.path).toContain("routes");
    });

    it("should have an absolute path", () => {
      expect(path.isAbsolute(config.apiRoutes.path)).toBe(true);
    });

    it("should end with routes directory", () => {
      expect(config.apiRoutes.path.endsWith("routes")).toBe(true);
    });

    it("should be within the location module src directory", () => {
      expect(config.apiRoutes.path).toContain("location");
      expect(config.apiRoutes.path).toContain("src");
    });
  });

  describe("Path Relationships", () => {
    it("should have prismaSchemas as sibling to moduleRoot", () => {
      const moduleParent = path.dirname(config.moduleRoot);
      const schemaParent = path.dirname(config.prismaSchemas);
      expect(moduleParent).toBe(schemaParent);
    });

    it("should have apiRoutes.path as child of moduleRoot", () => {
      expect(config.apiRoutes.path.startsWith(config.moduleRoot)).toBe(true);
    });

    it("should have correct relative path from moduleRoot to prismaSchemas", () => {
      const relativePath = path.relative(config.moduleRoot, config.prismaSchemas);
      expect(relativePath).toBe(path.join("..", "prisma"));
    });

    it("should have correct relative path from moduleRoot to apiRoutes", () => {
      const relativePath = path.relative(config.moduleRoot, config.apiRoutes.path);
      expect(relativePath).toBe("routes");
    });
  });
});
