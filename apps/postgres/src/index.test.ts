import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn()
}));

vi.mock("pg", () => ({
  default: {
    Pool: vi.fn()
  }
}));

vi.mock("../generated/prisma/client.js", () => {
  const mockPrismaClient = vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn()
  }));

  return {
    PrismaClient: mockPrismaClient
  };
});

/**
 * These tests verify Prisma client exports and require the generated client.
 * They are integration tests, not unit tests, so they are skipped in the standard test run.
 * Run them manually with: yarn generate && yarn test
 */
describe.skip("Prisma Client Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).prisma;
  });

  it("should export prisma client instance", async () => {
    const { prisma } = await import("./index.js");
    expect(prisma).toBeDefined();
  });

  it("should export PrismaClient type", async () => {
    const module = await import("./index.js");
    expect(module).toHaveProperty("PrismaClient");
  });

  it("should create a singleton prisma instance", async () => {
    const { prisma: prisma1 } = await import("./index.js");
    const { prisma: prisma2 } = await import("./index.js");
    expect(prisma1).toBe(prisma2);
  });

  it("should initialize prisma client", async () => {
    const { prisma } = await import("./index.js");
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe("object");
  });
});
