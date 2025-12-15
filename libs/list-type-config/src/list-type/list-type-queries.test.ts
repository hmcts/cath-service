import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createListType,
  findAllListTypes,
  findAllSubJurisdictions,
  findListTypeById,
  findListTypeByName,
  findNonStrategicListTypes,
  findStrategicListTypes,
  updateListType
} from "./list-type-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    },
    listTypeSubJurisdiction: {
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

const { prisma: mockPrisma } = await import("@hmcts/postgres");

describe("list-type-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAllListTypes", () => {
    it("should return all list types ordered by name", async () => {
      const mockListTypes = [
        { id: 1, name: "A_LIST", subJurisdictions: [] },
        { id: 2, name: "B_LIST", subJurisdictions: [] }
      ];
      mockPrisma.listType.findMany.mockResolvedValue(mockListTypes);

      const result = await findAllListTypes();

      expect(mockPrisma.listType.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
        include: {
          subJurisdictions: {
            include: {
              subJurisdiction: true
            }
          }
        }
      });
      expect(result).toEqual(mockListTypes);
    });
  });

  describe("findListTypeById", () => {
    it("should return list type by id with sub-jurisdictions", async () => {
      const mockListType = {
        id: 1,
        name: "TEST_LIST",
        subJurisdictions: [{ subJurisdiction: { id: 1, name: "England" } }]
      };
      mockPrisma.listType.findUnique.mockResolvedValue(mockListType);

      const result = await findListTypeById(1);

      expect(mockPrisma.listType.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          subJurisdictions: {
            include: {
              subJurisdiction: true
            }
          }
        }
      });
      expect(result).toEqual(mockListType);
    });

    it("should return null if list type not found", async () => {
      mockPrisma.listType.findUnique.mockResolvedValue(null);

      const result = await findListTypeById(999);

      expect(result).toBeNull();
    });
  });

  describe("findListTypeByName", () => {
    it("should return list type by name", async () => {
      const mockListType = { id: 1, name: "TEST_LIST" };
      mockPrisma.listType.findUnique.mockResolvedValue(mockListType);

      const result = await findListTypeByName("TEST_LIST");

      expect(mockPrisma.listType.findUnique).toHaveBeenCalledWith({
        where: { name: "TEST_LIST" }
      });
      expect(result).toEqual(mockListType);
    });

    it("should return null if list type not found", async () => {
      mockPrisma.listType.findUnique.mockResolvedValue(null);

      const result = await findListTypeByName("NON_EXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("findAllSubJurisdictions", () => {
    it("should return all sub-jurisdictions ordered by name", async () => {
      const mockSubJurisdictions = [
        { id: 1, name: "England" },
        { id: 2, name: "Wales" }
      ];
      mockPrisma.subJurisdiction.findMany.mockResolvedValue(mockSubJurisdictions);

      const result = await findAllSubJurisdictions();

      expect(mockPrisma.subJurisdiction.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" }
      });
      expect(result).toEqual(mockSubJurisdictions);
    });
  });

  describe("createListType", () => {
    it("should create a new list type with sub-jurisdictions", async () => {
      const createData = {
        name: "NEW_LIST",
        friendlyName: "New List",
        welshFriendlyName: "Rhestr Newydd",
        shortenedFriendlyName: "New",
        url: "/new-list",
        defaultSensitivity: "Public",
        allowedProvenance: ["CFT_IDAM", "B2C"],
        isNonStrategic: false,
        subJurisdictionIds: [1, 2]
      };

      const mockCreatedListType = { id: 1, ...createData };
      mockPrisma.listType.create.mockResolvedValue(mockCreatedListType);

      const result = await createListType(createData);

      expect(mockPrisma.listType.create).toHaveBeenCalledWith({
        data: {
          name: "NEW_LIST",
          friendlyName: "New List",
          welshFriendlyName: "Rhestr Newydd",
          shortenedFriendlyName: "New",
          url: "/new-list",
          defaultSensitivity: "Public",
          allowedProvenance: "CFT_IDAM,B2C",
          isNonStrategic: false,
          subJurisdictions: {
            create: [{ subJurisdictionId: 1 }, { subJurisdictionId: 2 }]
          }
        }
      });
      expect(result).toEqual(mockCreatedListType);
    });
  });

  describe("updateListType", () => {
    it("should update list type and replace sub-jurisdictions", async () => {
      const updateData = {
        name: "UPDATED_LIST",
        friendlyName: "Updated List",
        welshFriendlyName: "Rhestr Diweddaredig",
        shortenedFriendlyName: "Updated",
        url: "/updated-list",
        defaultSensitivity: "Private",
        allowedProvenance: ["CFT_IDAM"],
        isNonStrategic: true,
        subJurisdictionIds: [1, 3]
      };

      const mockUpdatedListType = { id: 1, ...updateData };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          listTypeSubJurisdiction: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 })
          },
          listType: {
            update: vi.fn().mockResolvedValue(mockUpdatedListType)
          }
        };
        return callback(tx);
      });

      const result = await updateListType(1, updateData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedListType);
    });
  });

  describe("findNonStrategicListTypes", () => {
    it("should return only non-strategic list types", async () => {
      const mockNonStrategicLists = [
        { id: 1, name: "NON_STRATEGIC_1", isNonStrategic: true, shortenedFriendlyName: "A" },
        { id: 2, name: "NON_STRATEGIC_2", isNonStrategic: true, shortenedFriendlyName: "B" }
      ];
      mockPrisma.listType.findMany.mockResolvedValue(mockNonStrategicLists);

      const result = await findNonStrategicListTypes();

      expect(mockPrisma.listType.findMany).toHaveBeenCalledWith({
        where: { isNonStrategic: true },
        orderBy: { shortenedFriendlyName: "asc" }
      });
      expect(result).toEqual(mockNonStrategicLists);
    });
  });

  describe("findStrategicListTypes", () => {
    it("should return only strategic list types", async () => {
      const mockStrategicLists = [
        { id: 1, name: "STRATEGIC_1", isNonStrategic: false, shortenedFriendlyName: "A" },
        { id: 2, name: "STRATEGIC_2", isNonStrategic: false, shortenedFriendlyName: "B" }
      ];
      mockPrisma.listType.findMany.mockResolvedValue(mockStrategicLists);

      const result = await findStrategicListTypes();

      expect(mockPrisma.listType.findMany).toHaveBeenCalledWith({
        where: { isNonStrategic: false },
        orderBy: { shortenedFriendlyName: "asc" }
      });
      expect(result).toEqual(mockStrategicLists);
    });
  });
});
