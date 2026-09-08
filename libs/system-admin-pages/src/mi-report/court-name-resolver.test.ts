import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCourtNameResolver } from "./court-name-resolver.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: { location: { findMany: vi.fn() } }
}));

describe("buildCourtNameResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.location.findMany).mockResolvedValue([
      { locationId: 1, name: "Court One" },
      { locationId: 2, name: "Court Two" }
    ] as never);
  });

  it("should resolve a numeric-string location id to its name", async () => {
    // Act
    const resolve = await buildCourtNameResolver();

    // Assert
    expect(resolve("1")).toBe("Court One");
    expect(resolve("2")).toBe("Court Two");
  });

  it("should return an empty string for an unknown or nullish location id", async () => {
    // Act
    const resolve = await buildCourtNameResolver();

    // Assert
    expect(resolve("999")).toBe("");
    expect(resolve(null)).toBe("");
    expect(resolve(undefined)).toBe("");
  });
});
