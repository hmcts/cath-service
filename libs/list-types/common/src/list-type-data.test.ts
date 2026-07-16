import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

const PCOL_LIST_TYPE = {
  name: "PCOL_DAILY_CAUSE_LIST",
  englishFriendlyName: "Possession Claim Online Daily Cause List",
  welshFriendlyName: "Rhestr Achosion Dyddiol Hawliadau Meddiant Ar-lein",
  shortenedFriendlyName: "PCOL Daily Cause List",
  provenance: "CFT_IDAM",
  defaultSensitivity: "Public",
  subJurisdictionIds: [1]
};

describe("listTypeData PCOL Daily Cause List", () => {
  it("should have exactly one entry", () => {
    // Arrange
    // Act
    const entries = listTypeData.filter((entry) => entry.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entries).toHaveLength(1);
  });

  it("should be strategic (isNonStrategic === false)", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.isNonStrategic).toBe(false);
  });

  it("should have provenance CFT_IDAM", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.provenance).toBe(PCOL_LIST_TYPE.provenance);
  });

  it("should have Public default sensitivity", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.defaultSensitivity).toBe(PCOL_LIST_TYPE.defaultSensitivity);
  });

  it("should be linked to the Civil Court sub-jurisdiction", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.subJurisdictionIds).toEqual(PCOL_LIST_TYPE.subJurisdictionIds);
  });

  it("should have the correct English and Welsh friendly names", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.englishFriendlyName).toBe(PCOL_LIST_TYPE.englishFriendlyName);
    expect(entry?.welshFriendlyName).toBe(PCOL_LIST_TYPE.welshFriendlyName);
  });

  it("should display the shortened friendly name in the manual upload form", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.shortenedFriendlyName).toBe(PCOL_LIST_TYPE.shortenedFriendlyName);
  });

  it("should not set a urlPath (flat-file list served via the generic route)", () => {
    // Arrange
    // Act
    const entry = listTypeData.find((item) => item.name === PCOL_LIST_TYPE.name);

    // Assert
    expect(entry?.urlPath).toBeUndefined();
  });
});
