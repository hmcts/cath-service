import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArtefact } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
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
      displayTo: new Date("2025-10-30")
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
      displayTo: new Date("2025-10-31")
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
      isFlatFile: true
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
      isFlatFile: true
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
        lastReceivedDate: expect.any(Date)
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
      displayTo: new Date("2025-11-20")
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
        displayTo: new Date("2025-10-30")
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
      displayTo
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
