import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveListType } from "./list-type-service.js";

vi.mock("./list-type-queries.js", () => ({
  findListTypeByName: vi.fn(),
  createListType: vi.fn(),
  updateListType: vi.fn()
}));

const {
  findListTypeByName: mockFindListTypeByName,
  createListType: mockCreateListType,
  updateListType: mockUpdateListType
} = await import("./list-type-queries.js");

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
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false,
      subJurisdictionIds: [1, 2]
    };

    describe("creating new list type", () => {
      it("should create a new list type when no existing id provided", async () => {
        mockFindListTypeByName.mockResolvedValue(null);
        const mockCreatedListType = { id: 1, ...validData };
        mockCreateListType.mockResolvedValue(mockCreatedListType);

        const result = await saveListType(validData);

        expect(mockFindListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(mockCreateListType).toHaveBeenCalledWith(validData);
        expect(mockUpdateListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockCreatedListType);
      });

      it("should throw error if list type with same name already exists", async () => {
        mockFindListTypeByName.mockResolvedValue({ id: 2, name: "TEST_LIST" });

        await expect(saveListType(validData)).rejects.toThrow("A list type with this name already exists");

        expect(mockFindListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(mockCreateListType).not.toHaveBeenCalled();
        expect(mockUpdateListType).not.toHaveBeenCalled();
      });
    });

    describe("updating existing list type", () => {
      it("should update list type when existing id provided", async () => {
        mockFindListTypeByName.mockResolvedValue({ id: 1, name: "TEST_LIST" });
        const mockUpdatedListType = { id: 1, ...validData };
        mockUpdateListType.mockResolvedValue(mockUpdatedListType);

        const result = await saveListType(validData, 1);

        expect(mockFindListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(mockUpdateListType).toHaveBeenCalledWith(1, validData);
        expect(mockCreateListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedListType);
      });

      it("should allow updating when name matches own id", async () => {
        mockFindListTypeByName.mockResolvedValue({ id: 1, name: "TEST_LIST" });
        const mockUpdatedListType = { id: 1, ...validData };
        mockUpdateListType.mockResolvedValue(mockUpdatedListType);

        const result = await saveListType(validData, 1);

        expect(result).toEqual(mockUpdatedListType);
      });

      it("should throw error when updating to name that belongs to different list type", async () => {
        mockFindListTypeByName.mockResolvedValue({ id: 2, name: "TEST_LIST" });

        await expect(saveListType(validData, 1)).rejects.toThrow("A list type with this name already exists");

        expect(mockFindListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(mockCreateListType).not.toHaveBeenCalled();
        expect(mockUpdateListType).not.toHaveBeenCalled();
      });

      it("should update when no existing list type with same name found", async () => {
        mockFindListTypeByName.mockResolvedValue(null);
        const mockUpdatedListType = { id: 1, ...validData };
        mockUpdateListType.mockResolvedValue(mockUpdatedListType);

        const result = await saveListType(validData, 1);

        expect(mockFindListTypeByName).toHaveBeenCalledWith("TEST_LIST");
        expect(mockUpdateListType).toHaveBeenCalledWith(1, validData);
        expect(mockCreateListType).not.toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedListType);
      });
    });
  });
});
