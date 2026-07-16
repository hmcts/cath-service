import { prisma } from "@hmcts/postgres-prisma";
import { describe, expect, it, vi } from "vitest";
import type { ParsedLocationData } from "../model.js";
import { upsertLocations } from "./upload-repository.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    subJurisdiction: {
      findMany: vi.fn()
    },
    region: {
      findMany: vi.fn()
    },
    location: {
      upsert: vi.fn()
    },
    locationSubJurisdiction: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    locationRegion: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    locationReference: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    }
  }
}));

describe("upsertLocations", () => {
  const mockData: ParsedLocationData[] = [
    {
      locationId: 1,
      locationName: "Test Court",
      welshLocationName: "Llys Prawf",
      email: "test@example.com",
      contactNo: "01234567890",
      subJurisdictionNames: ["Civil Court"],
      regionNames: ["London"],
      locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
    }
  ];

  it("should upsert location with transaction", async () => {
    const mockTx = {
      subJurisdiction: {
        findMany: vi.fn().mockResolvedValue([{ subJurisdictionId: 1 }])
      },
      region: {
        findMany: vi.fn().mockResolvedValue([{ regionId: 1 }])
      },
      location: {
        upsert: vi.fn().mockResolvedValue({})
      },
      locationSubJurisdiction: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({})
      },
      locationRegion: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({})
      },
      locationReference: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({})
      }
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    await upsertLocations(mockData);

    expect(mockTx.location.upsert).toHaveBeenCalledWith({
      where: { locationId: 1 },
      create: expect.objectContaining({
        locationId: 1,
        name: "Test Court",
        welshName: "Llys Prawf"
      }),
      update: expect.objectContaining({
        name: "Test Court",
        welshName: "Llys Prawf",
        deletedAt: null
      })
    });

    expect(mockTx.locationSubJurisdiction.deleteMany).toHaveBeenCalled();
    expect(mockTx.locationRegion.deleteMany).toHaveBeenCalled();
    expect(mockTx.locationSubJurisdiction.createMany).toHaveBeenCalled();
    expect(mockTx.locationRegion.createMany).toHaveBeenCalled();

    expect(mockTx.locationReference.deleteMany).toHaveBeenCalledWith({
      where: { locationId: 1 }
    });

    expect(mockTx.locationReference.createMany).toHaveBeenCalledWith({
      data: [
        {
          locationId: 1,
          provenance: "SNL",
          provenanceLocationId: "ext-123",
          provenanceLocationType: "VENUE"
        }
      ]
    });
  });

  it("should clear deletedAt when upserting a previously soft-deleted location", async () => {
    const mockTx = {
      subJurisdiction: { findMany: vi.fn().mockResolvedValue([]) },
      region: { findMany: vi.fn().mockResolvedValue([]) },
      location: { upsert: vi.fn().mockResolvedValue({}) },
      locationSubJurisdiction: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationRegion: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationReference: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) }
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(mockTx));

    await upsertLocations([{ ...mockData[0], locationReferences: [] }]);

    // Assert
    expect(mockTx.location.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ deletedAt: null })
      })
    );
  });

  it("should not call locationReference.createMany when locationReferences is empty", async () => {
    const dataWithNoRefs: ParsedLocationData[] = [{ ...mockData[0], locationReferences: [] }];

    const mockTx = {
      subJurisdiction: { findMany: vi.fn().mockResolvedValue([{ subJurisdictionId: 1 }]) },
      region: { findMany: vi.fn().mockResolvedValue([{ regionId: 1 }]) },
      location: { upsert: vi.fn().mockResolvedValue({}) },
      locationSubJurisdiction: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationRegion: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationReference: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) }
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    await upsertLocations(dataWithNoRefs);

    expect(mockTx.locationReference.deleteMany).toHaveBeenCalledWith({ where: { locationId: 1 } });
    expect(mockTx.locationReference.createMany).not.toHaveBeenCalled();
  });

  it("should merge rows with the same locationId so all their provenance references are stored", async () => {
    const dataWithSameLocationId: ParsedLocationData[] = [
      { ...mockData[0], locationReferences: [{ provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" }] },
      { ...mockData[0], locationReferences: [{ provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" }] },
      { ...mockData[0], locationReferences: [{ provenance: "COMMON_PLATFORM", provenanceLocationId: "cp-001", provenanceLocationType: "VENUE" }] }
    ];

    const mockTx = {
      subJurisdiction: { findMany: vi.fn().mockResolvedValue([{ subJurisdictionId: 1 }]) },
      region: { findMany: vi.fn().mockResolvedValue([{ regionId: 1 }]) },
      location: { upsert: vi.fn().mockResolvedValue({}) },
      locationSubJurisdiction: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationRegion: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationReference: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) }
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    await upsertLocations(dataWithSameLocationId);

    expect(mockTx.location.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.locationReference.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.locationReference.createMany).toHaveBeenCalledWith({
      data: [
        { locationId: 1, provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" },
        { locationId: 1, provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" },
        { locationId: 1, provenance: "COMMON_PLATFORM", provenanceLocationId: "cp-001", provenanceLocationType: "VENUE" }
      ]
    });
  });

  it("should create multiple location references when locationReferences has multiple entries", async () => {
    const dataWithMultipleRefs: ParsedLocationData[] = [
      {
        ...mockData[0],
        locationReferences: [
          { provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" },
          { provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" }
        ]
      }
    ];

    const mockTx = {
      subJurisdiction: { findMany: vi.fn().mockResolvedValue([{ subJurisdictionId: 1 }]) },
      region: { findMany: vi.fn().mockResolvedValue([{ regionId: 1 }]) },
      location: { upsert: vi.fn().mockResolvedValue({}) },
      locationSubJurisdiction: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationRegion: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
      locationReference: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) }
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });

    await upsertLocations(dataWithMultipleRefs);

    expect(mockTx.locationReference.createMany).toHaveBeenCalledWith({
      data: [
        { locationId: 1, provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" },
        { locationId: 1, provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" }
      ]
    });
  });
});
