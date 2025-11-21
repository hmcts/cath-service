import { describe, expect, it } from "vitest";
import { type ListType, mockListTypes } from "./index.js";

describe("@hmcts/list-types-common module exports", () => {
  describe("mockListTypes export", () => {
    it("should export mockListTypes", () => {
      expect(mockListTypes).toBeDefined();
    });

    it("should export mockListTypes as an array", () => {
      expect(Array.isArray(mockListTypes)).toBe(true);
    });

    it("should have list types with correct structure", () => {
      expect(mockListTypes.length).toBeGreaterThan(0);
      const firstItem = mockListTypes[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("name");
      expect(firstItem).toHaveProperty("englishFriendlyName");
      expect(firstItem).toHaveProperty("welshFriendlyName");
    });

    it("should include CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", () => {
      const civilAndFamilyList = mockListTypes.find((lt) => lt.name === "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
      expect(civilAndFamilyList).toBeDefined();
      expect(civilAndFamilyList?.englishFriendlyName).toBe("Civil and Family Daily Cause List");
      expect(civilAndFamilyList?.welshFriendlyName).toBe("Rhestr Achos Dyddiol Sifil a Theulu");
    });
  });

  describe("ListType type export", () => {
    it("should allow typing variables as ListType", () => {
      const listType: ListType = {
        id: 999,
        name: "TEST_LIST",
        englishFriendlyName: "Test List",
        welshFriendlyName: "Rhestr Prawf"
      };

      expect(listType.id).toBe(999);
      expect(listType.name).toBe("TEST_LIST");
      expect(listType.englishFriendlyName).toBe("Test List");
      expect(listType.welshFriendlyName).toBe("Rhestr Prawf");
    });

    it("should match the structure of mockListTypes items", () => {
      const firstItem: ListType = mockListTypes[0];
      expect(typeof firstItem.id).toBe("number");
      expect(typeof firstItem.name).toBe("string");
      expect(typeof firstItem.englishFriendlyName).toBe("string");
      expect(typeof firstItem.welshFriendlyName).toBe("string");
    });
  });
});
