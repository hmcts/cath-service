import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  subJurisdiction: {
    findMany: vi.fn()
  },
  listType: {
    upsert: vi.fn(),
    updateMany: vi.fn()
  },
  listTypeSubJurisdiction: {
    upsert: vi.fn()
  }
};

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: mockPrisma
}));

const mockListTypeData = [
  {
    name: "LIST_TYPE_1",
    englishFriendlyName: "List Type 1",
    welshFriendlyName: "Math Rhestr 1",
    shortenedFriendlyName: "LT1",
    urlPath: "list-type-1",
    defaultSensitivity: "Public",
    provenance: "CFT_IDAM",
    isNonStrategic: false,
    subJurisdictionIds: [1]
  },
  {
    name: "LIST_TYPE_2",
    englishFriendlyName: "List Type 2",
    welshFriendlyName: "Math Rhestr 2",
    urlPath: "list-type-2",
    defaultSensitivity: "Private",
    provenance: "CRIME_IDAM",
    isNonStrategic: true,
    subJurisdictionIds: [2]
  }
];

vi.mock("@hmcts/list-types-common", () => ({
  listTypeData: mockListTypeData
}));

describe("seedListTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.ENVIRONMENT;
    delete process.env.CI;

    mockPrisma.subJurisdiction.findMany.mockResolvedValue([
      { subJurisdictionId: 1, name: "Civil Court" },
      { subJurisdictionId: 2, name: "Family Court" }
    ]);
    mockPrisma.listType.upsert.mockResolvedValue({ id: 1 });
    mockPrisma.listType.updateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should upsert every list type in listTypeData", async () => {
    // Arrange
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act
    await seedListTypes();

    // Assert
    expect(mockPrisma.listType.upsert).toHaveBeenCalledTimes(mockListTypeData.length);
  });

  it("should reactivate a re-added list type by clearing deletedAt in the update block", async () => {
    // Arrange
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act
    await seedListTypes();

    // Assert
    expect(mockPrisma.listType.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "LIST_TYPE_1" },
        update: expect.objectContaining({ deletedAt: null })
      })
    );
  });

  it("should soft-delete active list types no longer in listTypeData, excluding test types", async () => {
    // Arrange
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act
    await seedListTypes();

    // Assert
    expect(mockPrisma.listType.updateMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        name: { notIn: ["LIST_TYPE_1", "LIST_TYPE_2"] },
        NOT: [{ name: { startsWith: "TEST_" } }, { name: { startsWith: "E2E_" } }]
      },
      data: { deletedAt: expect.any(Date) }
    });
  });

  it("should be idempotent — a second run soft-deletes nothing new", async () => {
    // Arrange
    mockPrisma.listType.updateMany.mockResolvedValue({ count: 0 });
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act
    await seedListTypes();
    await seedListTypes();

    // Assert — reconciliation always guarded by deletedAt: null, so re-runs are no-ops
    expect(mockPrisma.listType.updateMany).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.listType.updateMany.mock.calls) {
      expect(call[0].where.deletedAt).toBeNull();
    }
  });

  it("should skip seeding when ENVIRONMENT is prod", async () => {
    // Arrange
    process.env.ENVIRONMENT = "prod";
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act
    await seedListTypes();

    // Assert
    expect(mockPrisma.listType.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.listType.updateMany).not.toHaveBeenCalled();
  });

  it("should throw when no sub-jurisdictions exist", async () => {
    // Arrange
    mockPrisma.subJurisdiction.findMany.mockResolvedValue([]);
    const { seedListTypes } = await import("./seed-list-types.js");

    // Act & Assert
    await expect(seedListTypes()).rejects.toThrow("No sub-jurisdictions found");
  });
});
