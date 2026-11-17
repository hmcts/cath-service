import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { saveListType, setListTypeVisibility } from "./service.js";

vi.mock("./queries.js", () => ({
  findListTypeById: vi.fn(),
  findListTypeByName: vi.fn(),
  createListType: vi.fn(),
  updateListType: vi.fn(),
  updateListTypeVisibility: vi.fn()
}));

describe("list-type-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveListType", () => {
    const validData = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      caseNumberJsonFieldName: "caseNo",
      caseNameJsonFieldName: "caseName",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false,
      subJurisdictionIds: [1, 2]
    };

    describe("creating new list type", () => {
      it("should create a new list type when no existing id provided", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
        const mockCreatedListType = { id: 1, ...validData };
        vi.mocked(queries.createListType).mockResolvedValue(mockCreatedListType as any);

        const result = await saveListType(validData);

        expect(queries.findListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(queries.createListType).toHaveBeenCalledWith(validData);
        expect(queries.updateListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockCreatedListType);
      });

      it("should throw error if list type with same name already exists", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 2, name: "TEST_LIST" } as any);

        await expect(saveListType(validData)).rejects.toThrow("A list type with this name already exists");

        expect(queries.findListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(queries.createListType).not.toHaveBeenCalled();
        expect(queries.updateListType).not.toHaveBeenCalled();
      });
    });

    describe("updating existing list type", () => {
      it("should update list type when existing id provided", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 1, name: "TEST_LIST" } as any);
        const mockUpdatedListType = { id: 1, ...validData };
        vi.mocked(queries.updateListType).mockResolvedValue(mockUpdatedListType as any);

        const result = await saveListType(validData, 1);

        expect(queries.findListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(queries.updateListType).toHaveBeenCalledWith(1, validData);
        expect(queries.createListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedListType);
      });

      it("should allow updating when name matches own id", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 1, name: "TEST_LIST" } as any);
        const mockUpdatedListType = { id: 1, ...validData };
        vi.mocked(queries.updateListType).mockResolvedValue(mockUpdatedListType as any);

        const result = await saveListType(validData, 1);

        expect(result).toEqual(mockUpdatedListType);
      });

      it("should throw error when updating to name that belongs to different list type", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue({ id: 2, name: "TEST_LIST" } as any);

        await expect(saveListType(validData, 1)).rejects.toThrow("A list type with this name already exists");

        expect(queries.findListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(queries.createListType).not.toHaveBeenCalled();
        expect(queries.updateListType).not.toHaveBeenCalled();
      });

      it("should update when no existing list type with same name found", async () => {
        vi.mocked(queries.findListTypeByName).mockResolvedValue(null);
        const mockUpdatedListType = { id: 1, ...validData };
        vi.mocked(queries.updateListType).mockResolvedValue(mockUpdatedListType as any);

        const result = await saveListType(validData, 1);

        expect(queries.findListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(queries.updateListType).toHaveBeenCalledWith(1, validData);
        expect(queries.createListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedListType);
      });
    });
  });

  describe("setListTypeVisibility", () => {
    it("should return UPDATED when the visibility changes", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue({ id: 1, deletedAt: null } as any);
      vi.mocked(queries.updateListTypeVisibility).mockResolvedValue(1);

      // Act
      const result = await setListTypeVisibility(1, true);

      // Assert
      expect(queries.updateListTypeVisibility).toHaveBeenCalledWith(1, true);
      expect(result).toBe("UPDATED");
    });

    it("should return ALREADY_IN_STATE when no row was updated", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue({ id: 1, deletedAt: null } as any);
      vi.mocked(queries.updateListTypeVisibility).mockResolvedValue(0);

      // Act
      const result = await setListTypeVisibility(1, false);

      // Assert
      expect(result).toBe("ALREADY_IN_STATE");
    });

    it("should return NOT_FOUND when the list type does not exist", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue(null);

      // Act
      const result = await setListTypeVisibility(99, true);

      // Assert
      expect(result).toBe("NOT_FOUND");
      expect(queries.updateListTypeVisibility).not.toHaveBeenCalled();
    });

    it("should return NOT_FOUND when the list type is soft-deleted", async () => {
      // Arrange
      vi.mocked(queries.findListTypeById).mockResolvedValue({ id: 1, deletedAt: new Date() } as any);

      // Act
      const result = await setListTypeVisibility(1, true);

      // Assert
      expect(result).toBe("NOT_FOUND");
      expect(queries.updateListTypeVisibility).not.toHaveBeenCalled();
    });
  });
});
