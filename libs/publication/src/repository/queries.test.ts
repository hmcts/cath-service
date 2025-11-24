import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArtefact, deleteArtefacts, getArtefactById, getArtefactsByIds, getArtefactsByLocation, getArtefactsByLocationId } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres";

describe("createArtefact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new artefact when no existing artefact is found", async () => {
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "1",
      listTypeId: 6,
      contentDate: new Date("2025-10-23"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
    });

    const result = await createArtefact(artefactData);

    expect(result).toBe(artefactData.artefactId);
    expect(prisma.artefact.findFirst).toHaveBeenCalledWith({
      where: {
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        language: artefactData.language
      }
    });
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
        displayTo: artefactData.displayTo,
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD"
      }
    });
    expect(prisma.artefact.update).not.toHaveBeenCalled();
  });

  it("should update an existing artefact when a match is found", async () => {
    const existingArtefactId = "existing-artefact-id-123";
    const artefactData = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "1",
      listTypeId: 6,
      contentDate: new Date("2025-10-23"),
      sensitivity: "PRIVATE",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-21"),
      displayTo: new Date("2025-10-31"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue({
      artefactId: existingArtefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: "PUBLIC",
      language: artefactData.language,
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30"),
      lastReceivedDate: new Date("2025-10-19"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
    });

    vi.mocked(prisma.artefact.update).mockResolvedValue({
      artefactId: existingArtefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 1
    });

    const result = await createArtefact(artefactData);

    expect(result).toBe(existingArtefactId);
    expect(prisma.artefact.findFirst).toHaveBeenCalledWith({
      where: {
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        language: artefactData.language
      }
    });
    expect(prisma.artefact.update).toHaveBeenCalledTimes(1);
    expect(prisma.artefact.update).toHaveBeenCalledWith({
      where: { artefactId: existingArtefactId },
      data: {
        sensitivity: artefactData.sensitivity,
        displayFrom: artefactData.displayFrom,
        displayTo: artefactData.displayTo,
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        lastReceivedDate: expect.any(Date),
        supersededCount: {
          increment: 1
        }
      }
    });
    expect(prisma.artefact.create).not.toHaveBeenCalled();
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
      displayTo: new Date("2025-11-20"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
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
      displayTo: new Date("2025-12-05"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
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
      displayTo: new Date("2025-10-28"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
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
        displayTo: new Date("2025-10-30"),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD"
      };

      vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.artefact.create).mockResolvedValue({
        artefactId: artefactData.artefactId,
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom: artefactData.displayFrom,
        displayTo: artefactData.displayTo,
        lastReceivedDate: new Date(),
        isFlatFile: true
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
      displayTo,
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD"
    };

    vi.mocked(prisma.artefact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.artefact.create).mockResolvedValue({
      artefactId: artefactData.artefactId,
      locationId: artefactData.locationId,
      listTypeId: artefactData.listTypeId,
      contentDate: artefactData.contentDate,
      sensitivity: artefactData.sensitivity,
      language: artefactData.language,
      displayFrom: artefactData.displayFrom,
      displayTo: artefactData.displayTo,
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
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
        displayTo,
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD"
      }
    });
  });
});

describe("getArtefactsByLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return artefacts for a given location", async () => {
    const mockArtefacts = [
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440000",
        locationId: "123",
        listTypeId: 1,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      },
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440001",
        locationId: "123",
        listTypeId: 2,
        contentDate: new Date("2025-10-24"),
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: new Date("2025-10-22"),
        displayTo: new Date("2025-10-28"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByLocation("123");

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: { locationId: "123" },
      orderBy: { contentDate: "desc" }
    });
    expect(result).toHaveLength(2);
    expect(result[0].artefactId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result[1].artefactId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });

  it("should return empty array when no artefacts found", async () => {
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

    const result = await getArtefactsByLocation("999");

    expect(result).toEqual([]);
  });
});

describe("getArtefactsByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return artefacts by their IDs", async () => {
    const mockArtefacts = [
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440000",
        locationId: "123",
        listTypeId: 1,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByIds(["550e8400-e29b-41d4-a716-446655440000"]);

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: {
        artefactId: {
          in: ["550e8400-e29b-41d4-a716-446655440000"]
        }
      }
    });
    expect(result).toHaveLength(1);
    expect(result[0].artefactId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("should return multiple artefacts by their IDs", async () => {
    const mockArtefacts = [
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440000",
        locationId: "123",
        listTypeId: 1,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30"),
        lastReceivedDate: new Date()
      },
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440001",
        locationId: "456",
        listTypeId: 2,
        contentDate: new Date("2025-10-24"),
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: new Date("2025-10-22"),
        displayTo: new Date("2025-10-28"),
        lastReceivedDate: new Date()
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactsByIds(["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]);

    expect(result).toHaveLength(2);
  });

  it("should return empty array when no matching IDs found", async () => {
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

    const result = await getArtefactsByIds(["non-existent-id"]);

    expect(result).toEqual([]);
  });
});

describe("deleteArtefacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete artefacts by their IDs", async () => {
    vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 2 });

    await deleteArtefacts(["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]);

    expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
      where: {
        artefactId: {
          in: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
        }
      }
    });
  });

  it("should delete single artefact", async () => {
    vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 1 });

    await deleteArtefacts(["550e8400-e29b-41d4-a716-446655440000"]);

    expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
      where: {
        artefactId: {
          in: ["550e8400-e29b-41d4-a716-446655440000"]
        }
      }
    });
  });

  it("should handle empty array", async () => {
    vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 0 });

    await deleteArtefacts([]);

    expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
      where: {
        artefactId: {
          in: []
        }
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
