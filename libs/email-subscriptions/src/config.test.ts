import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleRoot, pageRoutes, prismaSchemas } from "./config.js";

describe("email-subscriptions config", () => {
  describe("pageRoutes", () => {
    it("should export pageRoutes with path property", () => {
      expect(pageRoutes).toBeDefined();
      expect(pageRoutes.path).toBeDefined();
      expect(typeof pageRoutes.path).toBe("string");
    });

    it("should point to pages directory", () => {
      expect(pageRoutes.path).toContain("pages");
    });
  });

  describe("moduleRoot", () => {
    it("should export moduleRoot as string", () => {
      expect(moduleRoot).toBeDefined();
      expect(typeof moduleRoot).toBe("string");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(moduleRoot)).toBe(true);
    });
  });

  describe("prismaSchemas", () => {
    it("should export prismaSchemas as string", () => {
      expect(prismaSchemas).toBeDefined();
      expect(typeof prismaSchemas).toBe("string");
    });

    it("should point to prisma directory", () => {
      expect(prismaSchemas).toContain("prisma");
    });

    it("should be an absolute path", () => {
      expect(path.isAbsolute(prismaSchemas)).toBe(true);
    });
  });
});
