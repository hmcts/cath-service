import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createArtefact,
  deleteArtefacts,
  getArtefactById,
  getArtefactListTypeId,
  getArtefactMetadata,
  getArtefactSummariesByLocation,
  getArtefactsByIds,
  getArtefactsByLocation,
  getArtefactType,
  getLocationsWithPublicationCount
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    $queryRaw: vi.fn()
  }
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      name: "CIVIL_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
      provenance: "CFT_IDAM"
    },
    {
      id: 2,
      name: "FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Family Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
      provenance: "CFT_IDAM"
    }
  ]
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";
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
      supersededCount: 0,
      noMatch: false
    } as any);

    const result = await createArtefact(artefactData as any);

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
      data: expect.objectContaining({
        artefactId: artefactData.artefactId,
        type: "LIST",
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate: artefactData.contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom: artefactData.displayFrom,
        displayTo: artefactData.displayTo,
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD"
      })
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
      supersededCount: 0,
      noMatch: false
    } as any);

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
      supersededCount: 1,
      noMatch: false
    } as any);

    const result = await createArtefact(artefactData as any);

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
      supersededCount: 0,
      noMatch: false
    } as any);

    await createArtefact(artefactData as any);

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
      supersededCount: 0,
      noMatch: false
    } as any);

    await createArtefact(artefactData as any);

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
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      } as any);

      await createArtefact(artefactData as any);

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
      supersededCount: 0,
      noMatch: false
    } as any);

    await createArtefact(artefactData as any);

    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        artefactId: artefactData.artefactId,
        type: "LIST",
        locationId: artefactData.locationId,
        listTypeId: artefactData.listTypeId,
        contentDate,
        sensitivity: artefactData.sensitivity,
        language: artefactData.language,
        displayFrom,
        displayTo,
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD"
      })
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
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
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
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      }
    ] as any;

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
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      }
    ] as any;

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
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
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
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      }
    ] as any;

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

  it("should return artefact when found", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2025-10-25"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20"),
      displayTo: new Date("2025-10-30"),
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0,
      noMatch: false
    } as any;

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

    const result = await getArtefactById("550e8400-e29b-41d4-a716-446655440000");

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "550e8400-e29b-41d4-a716-446655440000" }
    });
    expect(result).toEqual({
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 1,
      contentDate: mockArtefact.contentDate,
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: mockArtefact.displayFrom,
      displayTo: mockArtefact.displayTo,
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      noMatch: false
    });
  });

  it("should return null when artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getArtefactById("non-existent-id");

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "non-existent-id" }
    });
    expect(result).toBeNull();
  });

  it("should map database fields correctly", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440001",
      locationId: "456",
      listTypeId: 2,
      contentDate: new Date("2025-11-15"),
      sensitivity: "PRIVATE",
      language: "WELSH",
      displayFrom: new Date("2025-11-10"),
      displayTo: new Date("2025-11-20"),
      lastReceivedDate: new Date(),
      isFlatFile: false,
      provenance: "API",
      supersededCount: 5,
      noMatch: true
    } as any;

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

    const result = await getArtefactById("550e8400-e29b-41d4-a716-446655440001");

    expect(result).toEqual({
      artefactId: "550e8400-e29b-41d4-a716-446655440001",
      locationId: "456",
      listTypeId: 2,
      contentDate: mockArtefact.contentDate,
      sensitivity: "PRIVATE",
      language: "WELSH",
      displayFrom: mockArtefact.displayFrom,
      displayTo: mockArtefact.displayTo,
      isFlatFile: false,
      provenance: "API",
      noMatch: true
    });
  });
});

describe("getArtefactSummariesByLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return artefact summaries for a given location", async () => {
    const mockArtefacts = [
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440000",
        locationId: "123",
        listTypeId: 1,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20T10:00:00.000Z"),
        displayTo: new Date("2025-10-30T16:00:00.000Z"),
        lastReceivedDate: new Date(),
        isFlatFile: false,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      },
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440001",
        locationId: "123",
        listTypeId: 2,
        contentDate: new Date("2025-10-24"),
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: new Date("2025-10-22T09:00:00.000Z"),
        displayTo: new Date("2025-10-28T17:00:00.000Z"),
        lastReceivedDate: new Date(),
        isFlatFile: true,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      }
    ] as any;

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactSummariesByLocation("123");

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: { locationId: "123" },
      orderBy: { displayFrom: "desc" }
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      listType: "Civil Daily Cause List",
      displayFrom: "2025-10-20T10:00:00.000Z",
      displayTo: "2025-10-30T16:00:00.000Z"
    });
    expect(result[1]).toEqual({
      artefactId: "550e8400-e29b-41d4-a716-446655440001",
      listType: "Family Daily Cause List",
      displayFrom: "2025-10-22T09:00:00.000Z",
      displayTo: "2025-10-28T17:00:00.000Z"
    });
  });

  it("should return Unknown for list type when not found", async () => {
    const mockArtefacts = [
      {
        artefactId: "550e8400-e29b-41d4-a716-446655440000",
        locationId: "123",
        listTypeId: 999,
        contentDate: new Date("2025-10-25"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20T10:00:00.000Z"),
        displayTo: new Date("2025-10-30T16:00:00.000Z"),
        lastReceivedDate: new Date(),
        isFlatFile: false,
        provenance: "MANUAL_UPLOAD",
        supersededCount: 0,
        noMatch: false
      }
    ] as any;

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts);

    const result = await getArtefactSummariesByLocation("123");

    expect(result[0].listType).toBe("Unknown");
  });

  it("should return empty array when no artefacts found", async () => {
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

    const result = await getArtefactSummariesByLocation("999");

    expect(result).toEqual([]);
  });
});

describe("getArtefactMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return artefact metadata with location and list type details", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2025-10-25T00:00:00.000Z"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20T10:00:00.000Z"),
      displayTo: new Date("2025-10-30T16:00:00.000Z"),
      lastReceivedDate: new Date(),
      isFlatFile: false,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0,
      noMatch: false
    } as any;

    const mockLocation = {
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [1],
      subJurisdictions: [1]
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
    vi.mocked(getLocationById).mockResolvedValue(mockLocation);

    const result = await getArtefactMetadata("550e8400-e29b-41d4-a716-446655440000");

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "550e8400-e29b-41d4-a716-446655440000" }
    });
    expect(getLocationById).toHaveBeenCalledWith(123);
    expect(result).toEqual({
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      locationName: "Test Court",
      publicationType: "JSON",
      listType: "Civil Daily Cause List",
      provenance: "Manual Upload",
      language: "ENGLISH",
      sensitivity: "PUBLIC",
      contentDate: "2025-10-25T00:00:00.000Z",
      displayFrom: "2025-10-20T10:00:00.000Z",
      displayTo: "2025-10-30T16:00:00.000Z"
    });
  });

  it("should return Flat File for publication type when isFlatFile is true", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2025-10-25T00:00:00.000Z"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20T10:00:00.000Z"),
      displayTo: new Date("2025-10-30T16:00:00.000Z"),
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0,
      noMatch: false
    } as any;

    const mockLocation = {
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [1],
      subJurisdictions: [1]
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
    vi.mocked(getLocationById).mockResolvedValue(mockLocation);

    const result = await getArtefactMetadata("550e8400-e29b-41d4-a716-446655440000");

    expect(result?.publicationType).toBe("Flat File");
  });

  it("should return Unknown for location name when location not found", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "999",
      listTypeId: 1,
      contentDate: new Date("2025-10-25T00:00:00.000Z"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20T10:00:00.000Z"),
      displayTo: new Date("2025-10-30T16:00:00.000Z"),
      lastReceivedDate: new Date(),
      isFlatFile: false,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0,
      noMatch: false
    } as any;

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
    vi.mocked(getLocationById).mockResolvedValue(undefined);

    const result = await getArtefactMetadata("550e8400-e29b-41d4-a716-446655440000");

    expect(result?.locationName).toBe("Unknown");
  });

  it("should return Unknown for list type when not found", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 999,
      contentDate: new Date("2025-10-25T00:00:00.000Z"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20T10:00:00.000Z"),
      displayTo: new Date("2025-10-30T16:00:00.000Z"),
      lastReceivedDate: new Date(),
      isFlatFile: false,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0,
      noMatch: false
    } as any;

    const mockLocation = {
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [1],
      subJurisdictions: [1]
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
    vi.mocked(getLocationById).mockResolvedValue(mockLocation);

    const result = await getArtefactMetadata("550e8400-e29b-41d4-a716-446655440000");

    expect(result?.listType).toBe("Unknown");
  });

  it("should return provenance label from PROVENANCE_LABELS", async () => {
    const mockArtefact = {
      artefactId: "550e8400-e29b-41d4-a716-446655440000",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2025-10-25T00:00:00.000Z"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-10-20T10:00:00.000Z"),
      displayTo: new Date("2025-10-30T16:00:00.000Z"),
      lastReceivedDate: new Date(),
      isFlatFile: false,
      provenance: "XHIBIT",
      supersededCount: 0,
      noMatch: false
    } as any;

    const mockLocation = {
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [1],
      subJurisdictions: [1]
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
    vi.mocked(getLocationById).mockResolvedValue(mockLocation);

    const result = await getArtefactMetadata("550e8400-e29b-41d4-a716-446655440000");

    expect(result?.provenance).toBe("XHIBIT");
  });

  it("should return null when artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getArtefactMetadata("non-existent-id");

    expect(result).toBeNull();
    expect(getLocationById).not.toHaveBeenCalled();
  });
});

describe("getArtefactType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return flat-file when isFlatFile is true", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
      isFlatFile: true
    } as any);

    const result = await getArtefactType("550e8400-e29b-41d4-a716-446655440000");

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "550e8400-e29b-41d4-a716-446655440000" },
      select: { isFlatFile: true }
    });
    expect(result).toBe("flat-file");
  });

  it("should return json when isFlatFile is false", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
      isFlatFile: false
    } as any);

    const result = await getArtefactType("550e8400-e29b-41d4-a716-446655440001");

    expect(result).toBe("json");
  });

  it("should return null when artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getArtefactType("non-existent-id");

    expect(result).toBeNull();
  });
});

describe("getLocationsWithPublicationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return locations with publication counts", async () => {
    const mockResult = [
      {
        location_id: 1,
        location_name: "Manchester Crown Court",
        publication_count: BigInt(5)
      },
      {
        location_id: 2,
        location_name: "Birmingham Crown Court",
        publication_count: BigInt(3)
      }
    ];

    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

    const result = await getLocationsWithPublicationCount();

    expect(result).toEqual([
      {
        locationId: "1",
        locationName: "Manchester Crown Court",
        publicationCount: 5
      },
      {
        locationId: "2",
        locationName: "Birmingham Crown Court",
        publicationCount: 3
      }
    ]);
  });

  it("should return empty array when no locations have publications", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const result = await getLocationsWithPublicationCount();

    expect(result).toEqual([]);
  });

  it("should handle bigint conversion correctly", async () => {
    const mockResult = [
      {
        location_id: 123,
        location_name: "Test Court",
        publication_count: BigInt(999)
      }
    ];

    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

    const result = await getLocationsWithPublicationCount();

    expect(result[0].publicationCount).toBe(999);
    expect(typeof result[0].publicationCount).toBe("number");
  });

  it("should convert location_id to string", async () => {
    const mockResult = [
      {
        location_id: 456,
        location_name: "Test Location",
        publication_count: BigInt(10)
      }
    ];

    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

    const result = await getLocationsWithPublicationCount();

    expect(result[0].locationId).toBe("456");
    expect(typeof result[0].locationId).toBe("string");
  });
});

describe("getArtefactListTypeId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return listTypeId for valid artefact", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
      listTypeId: 1
    } as any);

    const result = await getArtefactListTypeId("test-artefact-id");

    expect(result).toBe(1);
    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "test-artefact-id" },
      select: { listTypeId: true }
    });
  });

  it("should return null when artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getArtefactListTypeId("non-existent-id");

    expect(result).toBeNull();
  });

  it("should return correct listTypeId for different artefacts", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
      listTypeId: 5
    } as any);

    const result = await getArtefactListTypeId("another-artefact");

    expect(result).toBe(5);
  });
});
