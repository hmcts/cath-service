import { prisma } from "@hmcts/postgres";
import { describe, expect, it, vi } from "vitest";
import type { ParsedLocationData } from "./model.js";
import { upsertLocations } from "./upload-repository.js";

vi.mock("@hmcts/postgres", () => ({
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
      regionNames: ["London"]
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
        welshName: "Llys Prawf"
      })
    });

    expect(mockTx.locationSubJurisdiction.deleteMany).toHaveBeenCalled();
    expect(mockTx.locationRegion.deleteMany).toHaveBeenCalled();
    expect(mockTx.locationSubJurisdiction.createMany).toHaveBeenCalled();
    expect(mockTx.locationRegion.createMany).toHaveBeenCalled();
  });
});
