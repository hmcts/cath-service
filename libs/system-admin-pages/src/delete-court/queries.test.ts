import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocationWithDetails, hasActiveArtefacts, hasActiveSubscriptions, softDeleteLocation } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    location: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    subscription: {
      count: vi.fn()
    },
    artefact: {
      count: vi.fn()
    }
  }
}));

const { prisma } = await import("@hmcts/postgres");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLocationWithDetails", () => {
  it("should return location details with regions and jurisdictions", async () => {
    const mockLocation = {
      locationId: 1,
      name: "Test Court",
      welshName: "Llys Prawf",
      locationRegions: [
        {
          region: {
            name: "London",
            welshName: "Llundain"
          }
        }
      ],
      locationSubJurisdictions: [
        {
          subJurisdiction: {
            name: "Civil Court",
            welshName: "Llys Sifil",
            jurisdiction: {
              name: "Civil",
              welshName: "Sifil"
            }
          }
        }
      ]
    };

    vi.mocked(prisma.location.findFirst).mockResolvedValue(mockLocation as any);

    const result = await getLocationWithDetails(1);

    expect(result).toEqual({
      locationId: 1,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [{ name: "London", welshName: "Llundain" }],
      subJurisdictions: [
        {
          name: "Civil Court",
          welshName: "Llys Sifil",
          jurisdictionName: "Civil",
          jurisdictionWelshName: "Sifil"
        }
      ]
    });
  });

  it("should filter out soft-deleted locations", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);

    const result = await getLocationWithDetails(1);

    expect(prisma.location.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          locationId: 1,
          deletedAt: null
        }
      })
    );
    expect(result).toBeNull();
  });

  it("should return null for non-existent location", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);

    const result = await getLocationWithDetails(999);

    expect(result).toBeNull();
  });
});

describe("hasActiveSubscriptions", () => {
  it("should return true when location has subscriptions", async () => {
    vi.mocked(prisma.subscription.count).mockResolvedValue(5);

    const result = await hasActiveSubscriptions(1);

    expect(result).toBe(true);
    expect(prisma.subscription.count).toHaveBeenCalledWith({
      where: { locationId: 1 }
    });
  });

  it("should return false when location has no subscriptions", async () => {
    vi.mocked(prisma.subscription.count).mockResolvedValue(0);

    const result = await hasActiveSubscriptions(1);

    expect(result).toBe(false);
  });
});

describe("hasActiveArtefacts", () => {
  it("should return true when location has active artefacts", async () => {
    vi.mocked(prisma.artefact.count).mockResolvedValue(3);

    const result = await hasActiveArtefacts(1);

    expect(result).toBe(true);
    expect(prisma.artefact.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          locationId: "1",
          displayTo: expect.objectContaining({
            gt: expect.any(Date)
          })
        })
      })
    );
  });

  it("should return false when location has no active artefacts", async () => {
    vi.mocked(prisma.artefact.count).mockResolvedValue(0);

    const result = await hasActiveArtefacts(1);

    expect(result).toBe(false);
  });

  it("should convert locationId to string for artefact query", async () => {
    vi.mocked(prisma.artefact.count).mockResolvedValue(0);

    await hasActiveArtefacts(123);

    expect(prisma.artefact.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          locationId: "123"
        })
      })
    );
  });
});

describe("softDeleteLocation", () => {
  it("should update location with deletedAt timestamp", async () => {
    vi.mocked(prisma.location.update).mockResolvedValue({} as any);

    await softDeleteLocation(1);

    expect(prisma.location.update).toHaveBeenCalledWith({
      where: { locationId: 1 },
      data: { deletedAt: expect.any(Date) }
    });
  });
});
