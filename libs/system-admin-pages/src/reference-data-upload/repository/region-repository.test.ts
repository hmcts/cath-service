import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRegionExists, createRegion, getMaxRegionId } from "./region-repository.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    region: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}));

describe("region-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMaxRegionId", () => {
    it("should return the highest region ID", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValueOnce({ regionId: 5 } as any);

      const result = await getMaxRegionId();

      expect(result).toBe(5);
      expect(prisma.region.findFirst).toHaveBeenCalledWith({
        orderBy: { regionId: "desc" },
        select: { regionId: true }
      });
    });

    it("should return 0 when no regions exist", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValueOnce(null);

      const result = await getMaxRegionId();

      expect(result).toBe(0);
    });
  });

  describe("checkRegionExists", () => {
    it("should return false for both when region does not exist", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValue(null);

      const result = await checkRegionExists("London", "Llundain");

      expect(result).toEqual({ nameExists: false, welshNameExists: false });
    });

    it("should return true for name when English name exists", async () => {
      vi.mocked(prisma.region.findFirst)
        .mockResolvedValueOnce({ regionId: 1, name: "London" } as any)
        .mockResolvedValueOnce(null);

      const result = await checkRegionExists("London", "Llundain");

      expect(result).toEqual({ nameExists: true, welshNameExists: false });
    });

    it("should return true for welshName when Welsh name exists", async () => {
      vi.mocked(prisma.region.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ regionId: 1, welshName: "Llundain" } as any);

      const result = await checkRegionExists("London", "Llundain");

      expect(result).toEqual({ nameExists: false, welshNameExists: true });
    });

    it("should be case insensitive", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValue(null);

      await checkRegionExists("LONDON", "llundain");

      expect(prisma.region.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ mode: "insensitive" })
          })
        })
      );
    });
  });

  describe("createRegion", () => {
    it("should create a new region with incremented ID", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValueOnce({ regionId: 3 } as any);
      vi.mocked(prisma.region.create).mockResolvedValueOnce({} as any);

      await createRegion("Midlands", "Canolbarth");

      expect(prisma.region.create).toHaveBeenCalledWith({
        data: {
          regionId: 4,
          name: "Midlands",
          welshName: "Canolbarth"
        }
      });
    });

    it("should trim whitespace from names", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValueOnce({ regionId: 1 } as any);
      vi.mocked(prisma.region.create).mockResolvedValueOnce({} as any);

      await createRegion("  London  ", "  Llundain  ");

      expect(prisma.region.create).toHaveBeenCalledWith({
        data: {
          regionId: 2,
          name: "London",
          welshName: "Llundain"
        }
      });
    });

    it("should create region with ID 1 when no regions exist", async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.region.create).mockResolvedValueOnce({} as any);

      await createRegion("North", "Gogledd");

      expect(prisma.region.create).toHaveBeenCalledWith({
        data: {
          regionId: 1,
          name: "North",
          welshName: "Gogledd"
        }
      });
    });
  });
});
