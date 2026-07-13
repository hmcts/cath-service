import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createJurisdictionRecord,
  deleteLocationJurisdictions,
  findJurisdictionDataById,
  hardDeleteJurisdictionRecord,
  hasDependencies,
  listAllJurisdictionData,
  updateJurisdictionRecord,
  updateLocationJurisdictions
} from "./queries.js";

const { mockTransaction } = vi.hoisted(() => ({ mockTransaction: vi.fn() }));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    jurisdiction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    region: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    location: {
      findUnique: vi.fn()
    },
    locationSubJurisdiction: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn()
    },
    locationRegion: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn()
    },
    listTypeSubJurisdiction: {
      count: vi.fn()
    },
    $transaction: mockTransaction
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("jurisdiction-management-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAllJurisdictionData", () => {
    it("should combine results from all three tables sorted by name", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue([{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }]);
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([
        { subJurisdictionId: 10, name: "County Court", welshName: "Llys Sirol", jurisdictionId: 1 }
      ]);
      vi.mocked(prisma.region.findMany).mockResolvedValue([{ regionId: 100, name: "North West", welshName: "Gogledd Orllewin" }]);

      // Act
      const result = await listAllJurisdictionData();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, name: "Civil", welshName: "Sifil", type: "Jurisdiction" });
      expect(result[1]).toEqual({ id: 10, name: "County Court", welshName: "Llys Sirol", type: "Sub-Jurisdiction" });
      expect(result[2]).toEqual({ id: 100, name: "North West", welshName: "Gogledd Orllewin", type: "Region" });
    });

    it("should filter jurisdictions when jurisdiction filter is provided", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue([{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }]);
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.region.findMany).mockResolvedValue([]);

      // Act
      const result = await listAllJurisdictionData({ jurisdiction: "Civil" });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("Jurisdiction");
      expect(prisma.jurisdiction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { equals: "Civil", mode: "insensitive" }
          })
        })
      );
    });

    it("should return all records without deleted_at filtering", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.region.findMany).mockResolvedValue([]);

      // Act
      await listAllJurisdictionData();

      // Assert
      expect(prisma.jurisdiction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(prisma.subJurisdiction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(prisma.region.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { name: "asc" } }));
    });
  });

  describe("findJurisdictionDataById", () => {
    it("should find jurisdiction by id", async () => {
      // Arrange
      const mockJurisdiction = { jurisdictionId: 1, name: "Civil", welshName: "Sifil" };
      vi.mocked(prisma.jurisdiction.findUnique).mockResolvedValue(mockJurisdiction);

      // Act
      const result = await findJurisdictionDataById(1, "Jurisdiction");

      // Assert
      expect(result).toEqual(mockJurisdiction);
      expect(prisma.jurisdiction.findUnique).toHaveBeenCalledWith({ where: { jurisdictionId: 1 } });
    });

    it("should find sub-jurisdiction by id", async () => {
      // Arrange
      vi.mocked(prisma.subJurisdiction.findUnique).mockResolvedValue(null);

      // Act
      const result = await findJurisdictionDataById(99, "Sub-Jurisdiction");

      // Assert
      expect(result).toBeNull();
      expect(prisma.subJurisdiction.findUnique).toHaveBeenCalledWith({ where: { subJurisdictionId: 99 } });
    });

    it("should find region by id", async () => {
      // Arrange
      const mockRegion = { regionId: 5, name: "London", welshName: "Llundain" };
      vi.mocked(prisma.region.findUnique).mockResolvedValue(mockRegion);

      // Act
      const result = await findJurisdictionDataById(5, "Region");

      // Assert
      expect(result).toEqual(mockRegion);
      expect(prisma.region.findUnique).toHaveBeenCalledWith({ where: { regionId: 5 } });
    });
  });

  describe("createJurisdictionRecord", () => {
    it("should create a jurisdiction with next available id", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({ jurisdictionId: 5, name: "X", welshName: "X" });
      vi.mocked(prisma.jurisdiction.create).mockResolvedValue({} as never);

      // Act
      await createJurisdictionRecord({ name: "Family", welshName: "Teulu", type: "Jurisdiction" });

      // Assert
      expect(prisma.jurisdiction.create).toHaveBeenCalledWith({
        data: { jurisdictionId: 6, name: "Family", welshName: "Teulu" }
      });
    });

    it("should create a region with next available id", async () => {
      // Arrange
      vi.mocked(prisma.region.findFirst).mockResolvedValue({ regionId: 10, name: "X", welshName: "X" });
      vi.mocked(prisma.region.create).mockResolvedValue({} as never);

      // Act
      await createJurisdictionRecord({ name: "South East", welshName: "De Ddwyrain", type: "Region" });

      // Assert
      expect(prisma.region.create).toHaveBeenCalledWith({
        data: { regionId: 11, name: "South East", welshName: "De Ddwyrain" }
      });
    });

    it("should create a sub-jurisdiction using transaction with table lock", async () => {
      // Arrange
      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn().mockResolvedValue([{ max: 20 }]),
          subJurisdiction: { create: vi.fn() }
        };
        return fn(tx);
      });

      // Act
      await createJurisdictionRecord({ name: "Crown Court", welshName: "Llys y Goron", type: "Sub-Jurisdiction", jurisdictionId: 2 });

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe("updateJurisdictionRecord", () => {
    it("should update jurisdiction name and welshName", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.update).mockResolvedValue({} as never);

      // Act
      await updateJurisdictionRecord(1, "Jurisdiction", { name: "Updated", welshName: "Diweddarwyd" });

      // Assert
      expect(prisma.jurisdiction.update).toHaveBeenCalledWith({
        where: { jurisdictionId: 1 },
        data: { name: "Updated", welshName: "Diweddarwyd" }
      });
    });

    it("should update region", async () => {
      // Arrange
      vi.mocked(prisma.region.update).mockResolvedValue({} as never);

      // Act
      await updateJurisdictionRecord(5, "Region", { name: "Updated Region" });

      // Assert
      expect(prisma.region.update).toHaveBeenCalledWith({
        where: { regionId: 5 },
        data: { name: "Updated Region" }
      });
    });
  });

  describe("hardDeleteJurisdictionRecord", () => {
    it("should hard delete a jurisdiction", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.delete).mockResolvedValue({} as never);

      // Act
      await hardDeleteJurisdictionRecord(1, "Jurisdiction");

      // Assert
      expect(prisma.jurisdiction.delete).toHaveBeenCalledWith({ where: { jurisdictionId: 1 } });
    });

    it("should hard delete a sub-jurisdiction", async () => {
      // Arrange
      vi.mocked(prisma.subJurisdiction.delete).mockResolvedValue({} as never);

      // Act
      await hardDeleteJurisdictionRecord(10, "Sub-Jurisdiction");

      // Assert
      expect(prisma.subJurisdiction.delete).toHaveBeenCalledWith({ where: { subJurisdictionId: 10 } });
    });

    it("should hard delete a region", async () => {
      // Arrange
      vi.mocked(prisma.region.delete).mockResolvedValue({} as never);

      // Act
      await hardDeleteJurisdictionRecord(5, "Region");

      // Assert
      expect(prisma.region.delete).toHaveBeenCalledWith({ where: { regionId: 5 } });
    });
  });

  describe("hasDependencies", () => {
    it("should return true when jurisdiction has sub-jurisdictions", async () => {
      // Arrange
      vi.mocked(prisma.subJurisdiction.count).mockResolvedValue(3);

      // Act
      const result = await hasDependencies(1, "Jurisdiction");

      // Assert
      expect(result).toBe(true);
      expect(prisma.subJurisdiction.count).toHaveBeenCalledWith({ where: { jurisdictionId: 1 } });
    });

    it("should return false when jurisdiction has no sub-jurisdictions", async () => {
      // Arrange
      vi.mocked(prisma.subJurisdiction.count).mockResolvedValue(0);

      // Act
      const result = await hasDependencies(1, "Jurisdiction");

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when sub-jurisdiction is linked to locations", async () => {
      // Arrange
      vi.mocked(prisma.locationSubJurisdiction.count).mockResolvedValue(2);
      vi.mocked(prisma.listTypeSubJurisdiction.count).mockResolvedValue(0);

      // Act
      const result = await hasDependencies(10, "Sub-Jurisdiction");

      // Assert
      expect(result).toBe(true);
      expect(prisma.locationSubJurisdiction.count).toHaveBeenCalledWith({ where: { subJurisdictionId: 10, location: { deletedAt: null } } });
    });

    it("should return true when sub-jurisdiction is linked to list types", async () => {
      // Arrange
      vi.mocked(prisma.locationSubJurisdiction.count).mockResolvedValue(0);
      vi.mocked(prisma.listTypeSubJurisdiction.count).mockResolvedValue(1);

      // Act
      const result = await hasDependencies(10, "Sub-Jurisdiction");

      // Assert
      expect(result).toBe(true);
      expect(prisma.listTypeSubJurisdiction.count).toHaveBeenCalledWith({ where: { subJurisdictionId: 10 } });
    });

    it("should return false when sub-jurisdiction has no dependencies", async () => {
      // Arrange
      vi.mocked(prisma.locationSubJurisdiction.count).mockResolvedValue(0);
      vi.mocked(prisma.listTypeSubJurisdiction.count).mockResolvedValue(0);

      // Act
      const result = await hasDependencies(10, "Sub-Jurisdiction");

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when region is linked to locations", async () => {
      // Arrange
      vi.mocked(prisma.locationRegion.count).mockResolvedValue(1);

      // Act
      const result = await hasDependencies(5, "Region");

      // Assert
      expect(result).toBe(true);
      expect(prisma.locationRegion.count).toHaveBeenCalledWith({ where: { regionId: 5, location: { deletedAt: null } } });
    });
  });

  describe("updateLocationJurisdictions", () => {
    it("should delete existing and create new junction rows in transaction", async () => {
      // Arrange
      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          locationSubJurisdiction: { deleteMany: vi.fn(), createMany: vi.fn() },
          locationRegion: { deleteMany: vi.fn(), createMany: vi.fn() }
        };
        await fn(tx);
        return tx;
      });

      // Act
      await updateLocationJurisdictions(100, [10, 11], [5]);

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe("deleteLocationJurisdictions", () => {
    it("should delete all junction rows for the location", async () => {
      // Arrange
      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          locationSubJurisdiction: { deleteMany: vi.fn() },
          locationRegion: { deleteMany: vi.fn() }
        };
        await fn(tx);
        return tx;
      });

      // Act
      await deleteLocationJurisdictions(100);

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});
