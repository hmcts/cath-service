import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { saveListType } from "./service.js";

vi.mock("./queries.js", () => ({
  findListTypeByName: vi.fn(),
  createListType: vi.fn(),
  updateListType: vi.fn()
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
});
