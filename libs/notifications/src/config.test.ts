import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { prismaSchemas } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("config", () => {
  describe("prismaSchemas", () => {
    it("should return the correct path to prisma directory", () => {
      const expectedPath = path.join(__dirname, "../prisma");
      expect(prismaSchemas).toBe(expectedPath);
    });

    it("should return an absolute path", () => {
      expect(path.isAbsolute(prismaSchemas)).toBe(true);
    });

    it("should point to an existing directory", () => {
      expect(existsSync(prismaSchemas)).toBe(true);
    });

    it("should resolve to a path ending with /prisma", () => {
      expect(prismaSchemas).toMatch(/\/prisma$/);
    });
  });
});
