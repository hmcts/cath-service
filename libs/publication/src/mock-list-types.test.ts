import { describe, expect, it } from "vitest";
import { type ListType, mockListTypes } from "./mock-list-types.js";

describe("mockListTypes", () => {
  it("should be an array", () => {
    expect(Array.isArray(mockListTypes)).toBe(true);
  });

  it("should have at least 5 list types", () => {
    expect(mockListTypes.length).toBeGreaterThanOrEqual(5);
  });

  it("should have list types with required properties", () => {
    for (const listType of mockListTypes) {
      expect(listType).toHaveProperty("id");
      expect(listType).toHaveProperty("name");
      expect(listType).toHaveProperty("englishFriendlyName");
      expect(listType).toHaveProperty("welshFriendlyName");
    }
  });

  it("should have unique IDs for each list type", () => {
    const ids = mockListTypes.map((lt) => lt.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid string names", () => {
    for (const listType of mockListTypes) {
      expect(typeof listType.name).toBe("string");
      expect(listType.name.length).toBeGreaterThan(0);
    }
  });

  it("should have valid English friendly names", () => {
    for (const listType of mockListTypes) {
      expect(typeof listType.englishFriendlyName).toBe("string");
      expect(listType.englishFriendlyName.length).toBeGreaterThan(0);
    }
  });

  it("should have valid Welsh friendly names", () => {
    for (const listType of mockListTypes) {
      expect(typeof listType.welshFriendlyName).toBe("string");
      expect(listType.welshFriendlyName.length).toBeGreaterThan(0);
    }
  });

  it("should have positive integer IDs", () => {
    for (const listType of mockListTypes) {
      expect(Number.isInteger(listType.id)).toBe(true);
      expect(listType.id).toBeGreaterThan(0);
    }
  });

  it("should include CIVIL_DAILY_CAUSE_LIST", () => {
    const civilList = mockListTypes.find((lt) => lt.name === "CIVIL_DAILY_CAUSE_LIST");
    expect(civilList).toBeDefined();
    expect(civilList?.englishFriendlyName).toBe("Civil Daily Cause List");
  });

  it("should include FAMILY_DAILY_CAUSE_LIST", () => {
    const familyList = mockListTypes.find((lt) => lt.name === "FAMILY_DAILY_CAUSE_LIST");
    expect(familyList).toBeDefined();
    expect(familyList?.englishFriendlyName).toBe("Family Daily Cause List");
  });

  it("should include CRIME_DAILY_LIST", () => {
    const crimeList = mockListTypes.find((lt) => lt.name === "CRIME_DAILY_LIST");
    expect(crimeList).toBeDefined();
    expect(crimeList?.englishFriendlyName).toBe("Crime Daily List");
  });

  it("should include MAGISTRATES_PUBLIC_LIST", () => {
    const magList = mockListTypes.find((lt) => lt.name === "MAGISTRATES_PUBLIC_LIST");
    expect(magList).toBeDefined();
    expect(magList?.englishFriendlyName).toBe("Magistrates Public List");
  });

  it("should include CROWN_WARNED_LIST", () => {
    const crownList = mockListTypes.find((lt) => lt.name === "CROWN_WARNED_LIST");
    expect(crownList).toBeDefined();
    expect(crownList?.englishFriendlyName).toBe("Crown Warned List");
  });
});
