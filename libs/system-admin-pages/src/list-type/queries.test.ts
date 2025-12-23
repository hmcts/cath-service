import { prisma } from "@hmcts/postgres";
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
} from "./queries.js";

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
      vi.mocked(prisma.listType.findMany).mockResolvedValue(mockListTypes as any);

      const result = await findAllListTypes();

      expect(prisma.listType.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
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
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);

      const result = await findListTypeById(1);

      expect(prisma.listType.findUnique).toHaveBeenCalledWith({
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
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      const result = await findListTypeById(999);

      expect(result).toBeNull();
    });
  });

  describe("findListTypeByName", () => {
    it("should return list type by name", async () => {
      const mockListType = { id: 1, name: "TEST_LIST" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);

      const result = await findListTypeByName("TEST_LIST");

      expect(prisma.listType.findUnique).toHaveBeenCalledWith({
        where: { name: "TEST_LIST" }
      });
      expect(result).toEqual(mockListType);
    });

    it("should return null if list type not found", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

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
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue(mockSubJurisdictions as any);

      const result = await findAllSubJurisdictions();

      expect(prisma.subJurisdiction.findMany).toHaveBeenCalledWith({
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
      vi.mocked(prisma.listType.create).mockResolvedValue(mockCreatedListType as any);

      const result = await createListType(createData);

      expect(prisma.listType.create).toHaveBeenCalledWith({
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

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
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

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedListType);
    });
  });

  describe("findNonStrategicListTypes", () => {
    it("should return only non-strategic list types", async () => {
      const mockNonStrategicLists = [
        { id: 1, name: "NON_STRATEGIC_1", isNonStrategic: true, shortenedFriendlyName: "A" },
        { id: 2, name: "NON_STRATEGIC_2", isNonStrategic: true, shortenedFriendlyName: "B" }
      ];
      vi.mocked(prisma.listType.findMany).mockResolvedValue(mockNonStrategicLists as any);

      const result = await findNonStrategicListTypes();

      expect(prisma.listType.findMany).toHaveBeenCalledWith({
        where: { isNonStrategic: true, deletedAt: null },
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
      vi.mocked(prisma.listType.findMany).mockResolvedValue(mockStrategicLists as any);

      const result = await findStrategicListTypes();

      expect(prisma.listType.findMany).toHaveBeenCalledWith({
        where: { isNonStrategic: false, deletedAt: null },
        orderBy: { shortenedFriendlyName: "asc" }
      });
      expect(result).toEqual(mockStrategicLists);
    });
  });
});
