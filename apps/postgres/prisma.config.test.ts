import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dotenv to avoid side effects
vi.mock("dotenv/config", () => ({}));

// Mock prisma/config
vi.mock("prisma/config", () => ({
  defineConfig: (config: unknown) => config
}));

// Mock fs to avoid actual file reads during config import
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue("")
  }
}));

describe("Prisma Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have schema path configuration", async () => {
    const configModule = await import("./prisma.config.js");
    expect(configModule.default).toBeDefined();
    const config = configModule.default;
    expect(config).toHaveProperty("schema");
    expect(typeof config.schema).toBe("string");
  });

  it("should have migrations path configuration", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    expect(config).toHaveProperty("migrations");
    expect(config.migrations).toHaveProperty("path");
    expect(typeof config.migrations.path).toBe("string");
  });

  it("should point schema to dist directory", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    expect(config.schema).toContain("dist");
    expect(config.schema).toContain("schema.prisma");
  });

  it("should point migrations to prisma/migrations directory", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    expect(config.migrations.path).toContain("prisma");
    expect(config.migrations.path).toContain("migrations");
  });

  it("should use path.join for consistent path construction", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    const expectedSchemaPath = path.join("dist", "schema.prisma");
    const expectedMigrationsPath = path.join("prisma", "migrations");
    expect(config.schema).toBe(expectedSchemaPath);
    expect(config.migrations.path).toBe(expectedMigrationsPath);
  });

  it("should have seed command configuration", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    expect(config).toHaveProperty("seed");
    expect(config.seed).toHaveProperty("command");
    expect(typeof config.seed.command).toBe("string");
  });

  it("should point seed to prisma/seed.ts file", async () => {
    const configModule = await import("./prisma.config.js");
    const config = configModule.default;
    expect(config.seed.command).toContain("prisma/seed.ts");
    expect(config.seed.command).toContain("tsx");
    expect(config.seed.command).toContain("node_modules");
  });
});
