import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrismaPg, mockPrismaClient } = vi.hoisted(() => ({
  mockPrismaPg: vi.fn(function PrismaPg(this: Record<string, unknown>, options: unknown) {
    this.options = options;
  }),
  mockPrismaClient: vi.fn(function PrismaClient(this: Record<string, unknown>, options: unknown) {
    this.options = options;
  })
}));

// vitest.setup.ts mocks this package globally; this file tests the real module.
vi.unmock("@hmcts/postgres-prisma");
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: mockPrismaPg }));
vi.mock("../generated/prisma/client.js", () => ({ PrismaClient: mockPrismaClient }));

const POSTGRES_ENV = {
  POSTGRES_HOST: "db-host",
  POSTGRES_USER: "db-user",
  POSTGRES_PASSWORD: "db-pass",
  POSTGRES_PORT: "5432",
  POSTGRES_DATABASE: "cath"
};

const globalForPrisma = globalThis as unknown as { prisma: unknown };

async function importIndex() {
  return import("./index.js");
}

describe("postgres-prisma index", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = {};
    delete globalForPrisma.prisma;
  });

  afterEach(() => {
    process.env = originalEnv;
    delete globalForPrisma.prisma;
  });

  describe("DATABASE_URL", () => {
    it("should build DATABASE_URL from the individual POSTGRES_* env vars when all are set", async () => {
      // Arrange
      process.env = { ...POSTGRES_ENV, DATABASE_URL: "postgresql://ignored" };

      // Act
      await importIndex();

      // Assert
      const expectedUrl = "postgresql://db-user:db-pass@db-host:5432/cath?sslmode=require";
      expect(process.env.DATABASE_URL).toBe(expectedUrl);
      expect(mockPrismaPg).toHaveBeenCalledWith({ connectionString: expectedUrl });
    });

    it("should keep an existing DATABASE_URL when a POSTGRES_* env var is missing", async () => {
      // Arrange
      const { POSTGRES_PASSWORD: _omitted, ...partialEnv } = POSTGRES_ENV;
      process.env = { ...partialEnv, DATABASE_URL: "postgresql://existing@host:5432/db" };

      // Act
      await importIndex();

      // Assert
      expect(process.env.DATABASE_URL).toBe("postgresql://existing@host:5432/db");
      expect(mockPrismaPg).toHaveBeenCalledWith({ connectionString: "postgresql://existing@host:5432/db" });
    });

    it("should fall back to the local default when no database env vars are set", async () => {
      // Act
      await importIndex();

      // Assert
      expect(process.env.DATABASE_URL).toBe("postgresql://hmcts@localhost:5433/postgres");
    });
  });

  describe("PrismaClient", () => {
    it("should create a client with the pg adapter", async () => {
      // Act
      const { prisma } = await importIndex();

      // Assert
      expect(mockPrismaClient).toHaveBeenCalledTimes(1);
      expect(prisma).toBe(mockPrismaClient.mock.instances[0]);
      expect(mockPrismaClient.mock.calls[0][0]).toEqual(expect.objectContaining({ adapter: mockPrismaPg.mock.instances[0] }));
    });

    it("should log queries, errors and warnings in local development", async () => {
      // Arrange
      process.env = { NODE_ENV: "development" };

      // Act
      await importIndex();

      // Assert
      expect(mockPrismaClient.mock.calls[0][0]).toEqual(expect.objectContaining({ log: ["query", "error", "warn"] }));
    });

    it("should log only errors in development on CI", async () => {
      // Arrange
      process.env = { NODE_ENV: "development", CI: "true" };

      // Act
      await importIndex();

      // Assert
      expect(mockPrismaClient.mock.calls[0][0]).toEqual(expect.objectContaining({ log: ["error"] }));
    });

    it("should cache the client globally outside production and reuse it on re-import", async () => {
      // Arrange
      process.env = { NODE_ENV: "test" };
      const { prisma: first } = await importIndex();
      vi.resetModules();

      // Act
      const { prisma: second } = await importIndex();

      // Assert
      expect(globalForPrisma.prisma).toBe(first);
      expect(second).toBe(first);
      expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    });

    it("should not cache the client globally in production", async () => {
      // Arrange
      process.env = { NODE_ENV: "production" };

      // Act
      await importIndex();

      // Assert
      expect(globalForPrisma.prisma).toBeUndefined();
      expect(mockPrismaClient.mock.calls[0][0]).toEqual(expect.objectContaining({ log: ["error"] }));
    });
  });
});
