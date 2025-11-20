import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArtefact, getArtefactById, getArtefactsByLocationId } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres";

describe("createArtefact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an artefact with all required fields", async () => {
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "1",
      listTypeId: 6,
      contentDate: new Date("2025-10-23"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30")
    };

    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date()
    });

    await createArtefact(artefactData);

    expect(prisma.artefact.create).toHaveBeenCalledTimes(1);
    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: {
        artefactId: artefactData.artefactId,
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom: artefactData.displayFrom,
        displayTo: artefactData.displayTo
      }
    });
  });

  it("should create an artefact with PRIVATE sensitivity", async () => {
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440001",
      locationId: "2",
      listTypeId: 1,
      contentDate: new Date("2025-11-15"),
      sensitivity: "PRIVATE",
      language: "WELSH",
      displayFrom: new Date("2025-11-10"),
      displayTo: new Date("2025-11-20")
    };

    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date()
    });

    await createArtefact(artefactData);

    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sensitivity: "PRIVATE"
      })
    });
  });

  it("should create an artefact with BILINGUAL language", async () => {
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440002",
      locationId: "3",
      listTypeId: 2,
      contentDate: new Date("2025-12-01"),
      sensitivity: "PUBLIC",
      language: "BILINGUAL",
      displayFrom: new Date("2025-11-25"),
      displayTo: new Date("2025-12-05")
    };

    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date()
    });

    await createArtefact(artefactData);

    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        language: "BILINGUAL"
      })
    });
  });

  it("should handle database errors", async () => {
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440003",
      locationId: "4",
      listTypeId: 3,
      contentDate: new Date("2025-10-25"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-22"),
      displayTo: new Date("2025-10-28")
    };

    vi.mocked(prisma.artefact.create).mockRejectedValue(new Error("Database connection error"));

    await expect(createArtefact(artefactData)).rejects.toThrow("Database connection error");
  });

  it("should create an artefact with different list type IDs", async () => {
    const listTypeIds = [1, 2, 3, 4, 5, 6, 7];

    for (const listTypeId of listTypeIds) {
      vi.clearAllMocks();

      const artefactData = {
        artefactId: `550e8400-e29b-41d4-a716-44665544000${listTypeId}`,
        locationId: "1",
        listTypeId,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      };

      vi.mocked(prisma.artefact.create).mockResolvedValue({
        artefactId: artefactData.artefactId,
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom: artefactData.displayFrom,
        displayTo: artefactData.displayTo,
        lastReceivedDate: new Date()
      });

      await createArtefact(artefactData);

      expect(prisma.artefact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          listTypeId
        })
      });
    }
  });

  it("should preserve date values exactly as provided", async () => {
    const contentDate = new Date("2025-10-23T00:00:00.000Z");
    const displayFrom = new Date("2025-10-20T00:00:00.000Z");
    const displayTo = new Date("2025-10-30T23:59:59.999Z");

    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440010",
      locationId: "1",
      listTypeId: 6,
      contentDate,
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom,
      displayTo
    };

    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date()
    });

    await createArtefact(artefactData);

    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: {
        artefactId: artefactData.artefactId,
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom,
        displayTo
      }
    });
  });
});

describe("getArtefactById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve an artefact by id", async () => {
    const artefactId = "550e8400-e29b-41d4-a716-446655440000";
    const mockArtefact = {
      artefactId,
      locationId: "1",
      listTypeId: 6,
      contentDate: new Date("2025-10-23"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30"),
      lastReceivedDate: new Date()
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

    const result = await getArtefactById(artefactId);

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: {
        artefactId
      }
    });
    expect(result).toEqual({
      artefactId: mockArtefact.artefactId,
      locationId: mockArtefact.locationId,
      listTypeId: mockArtefact.listTypeId,
      contentDate: mockArtefact.contentDate,
      sensitivity: mockArtefact.sensitivity,
      language: mockArtefact.language,
      displayFrom: mockArtefact.displayFrom,
      displayTo: mockArtefact.displayTo
    });
  });

  it("should return null when artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getArtefactById("non-existent-id");

    expect(result).toBeNull();
  });

  it("should handle database errors", async () => {
    vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("Database connection error"));

    await expect(getArtefactById("test-id")).rejects.toThrow("Database connection error");
  });

  it("should not include lastReceivedDate in returned object", async () => {
    const mockArtefact = {
      artefactId: "test-id",
      locationId: "1",
      listTypeId: 6,
      contentDate: new Date("2025-10-23"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30"),
      lastReceivedDate: new Date()
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

    const result = await getArtefactById("test-id");

    expect(result).not.toHaveProperty("lastReceivedDate");
  });
});

describe("getArtefactsByLocationId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve all artefacts for a location", async () => {
    const locationId = "1";
    const mockArtefacts = [
      {
        artefactId: "artefact-1",
        locationId,
        listTypeId: 6,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      },
      {
        artefactId: "artefact-2",
        locationId,
        listTypeId: 4,
        contentDate: new Date("2025-10-22"),
        sensitivity: "PUBLIC",
        language: "WELSH",
        displayFrom: new Date("2025-10-19"),
        displayTo: new Date("2025-10-29"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByLocationId(locationId);

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: {
        locationId
      },
      orderBy: {
        contentDate: "desc"
      }
    });
    expect(result).toHaveLength(2);
    expect(result[0].artefactId).toBe("artefact-1");
    expect(result[1].artefactId).toBe("artefact-2");
  });

  it("should return empty array when no artefacts found", async () => {
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

    const result = await getArtefactsByLocationId("999");

    expect(result).toEqual([]);
  });

  it("should order results by contentDate descending", async () => {
    const mockArtefacts = [
      {
        artefactId: "newer",
        locationId: "1",
        listTypeId: 6,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      },
      {
        artefactId: "older",
        locationId: "1",
        listTypeId: 6,
        contentDate: new Date("2025-10-20"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-15"),
        displayTo: new Date("2025-10-25"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    await getArtefactsByLocationId("1");

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: { locationId: "1" },
      orderBy: { contentDate: "desc" }
    });
  });

  it("should not include lastReceivedDate in returned objects", async () => {
    const mockArtefacts = [
      {
        artefactId: "test",
        locationId: "1",
        listTypeId: 6,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByLocationId("1");

    expect(result[0]).not.toHaveProperty("lastReceivedDate");
  });

  it("should handle database errors", async () => {
    vi.mocked(prisma.artefact.findMany).mockRejectedValue(new Error("Database connection error"));

    await expect(getArtefactsByLocationId("1")).rejects.toThrow("Database connection error");
  });

  it("should map all required fields correctly", async () => {
    const mockArtefacts = [
      {
        artefactId: "test-id",
        locationId: "2",
        listTypeId: 3,
        contentDate: new Date("2025-11-01"),
        sensitivity: "PRIVATE",
        language: "BILINGUAL",
        displayFrom: new Date("2025-10-28"),
        displayTo: new Date("2025-11-05"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByLocationId("2");

    expect(result[0]).toEqual({
      artefactId: "test-id",
      locationId: "2",
      listTypeId: 3,
      contentDate: mockArtefacts[0].contentDate,
      sensitivity: "PRIVATE",
      language: "BILINGUAL",
      displayFrom: mockArtefacts[0].displayFrom,
      displayTo: mockArtefacts[0].displayTo
    });
  });
});
