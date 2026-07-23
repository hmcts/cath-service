import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

const NEW_LIST_TYPES = [
  {
    name: "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Business & Property Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Busnes ac Eiddo",
    urlPath: "business-and-property-daily-list",
    subJurisdictionIds: [10]
  },
  {
    name: "CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Circuit Commercial Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Masnachol Cylchdaith",
    urlPath: "circuit-commercial-court-daily-list",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil yr Uchel Lys",
    urlPath: "high-court-civil-daily-list",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Family Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Teulu yr Uchel Lys",
    urlPath: "high-court-family-daily-list",
    subJurisdictionIds: [11]
  }
];

describe("listTypeData High Court flat-file daily cause lists", () => {
  for (const expected of NEW_LIST_TYPES) {
    describe(expected.name, () => {
      it("should have exactly one entry", () => {
        // Arrange
        // Act
        const entries = listTypeData.filter((entry) => entry.name === expected.name);

        // Assert
        expect(entries).toHaveLength(1);
      });

      it("should be strategic (isNonStrategic === false)", () => {
        // Arrange
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.isNonStrategic).toBe(false);
      });

      it("should have provenance CFT_IDAM", () => {
        // Arrange
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.provenance).toBe("CFT_IDAM");
      });

      it("should have the correct urlPath", () => {
        // Arrange
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.urlPath).toBe(expected.urlPath);
      });

      it("should have the correct subJurisdictionIds", () => {
        // Arrange
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.subJurisdictionIds).toEqual(expected.subJurisdictionIds);
      });

      it("should have the correct English and Welsh friendly names", () => {
        // Arrange
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.englishFriendlyName).toBe(expected.englishFriendlyName);
        expect(entry?.welshFriendlyName).toBe(expected.welshFriendlyName);
      });
    });
  }

  it("should have unique names for the four new list types across the catalogue", () => {
    // Arrange
    const newNames = NEW_LIST_TYPES.map((item) => item.name);

    // Act
    const counts = newNames.map((name) => listTypeData.filter((entry) => entry.name === name).length);

    // Assert
    expect(counts).toEqual([1, 1, 1, 1]);
  });

  it("should have unique urlPaths for the four new list types across the catalogue", () => {
    // Arrange
    const newUrlPaths = NEW_LIST_TYPES.map((item) => item.urlPath);

    // Act
    const counts = newUrlPaths.map((urlPath) => listTypeData.filter((entry) => entry.urlPath === urlPath).length);

    // Assert
    expect(counts).toEqual([1, 1, 1, 1]);
  });
});

const IAC_LIST_TYPES = [
  {
    name: "IAC_DAILY_LIST",
    englishFriendlyName: "Immigration and Asylum Chamber Daily List",
    welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
    shortenedFriendlyName: "IAC Daily List",
    urlPath: "iac-daily-list",
    defaultSensitivity: "Public",
    subJurisdictionIds: [6]
  },
  {
    name: "IAC_DAILY_LIST_ADDITIONAL_CASES",
    englishFriendlyName: "Immigration and Asylum Chamber Daily List - Additional Cases",
    welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches – Achosion Ychwanegol",
    shortenedFriendlyName: "IAC Daily List – Additional Cases",
    urlPath: "iac-daily-list-additional-cases",
    defaultSensitivity: "Public",
    subJurisdictionIds: [6]
  }
];

describe("listTypeData IAC daily lists", () => {
  for (const expected of IAC_LIST_TYPES) {
    describe(expected.name, () => {
      it("should have exactly one entry", () => {
        // Act
        const entries = listTypeData.filter((entry) => entry.name === expected.name);

        // Assert
        expect(entries).toHaveLength(1);
      });

      it("should be strategic (isNonStrategic === false)", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.isNonStrategic).toBe(false);
      });

      it("should have provenance CFT_IDAM", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.provenance).toBe("CFT_IDAM");
      });

      it("should have defaultSensitivity Public", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.defaultSensitivity).toBe(expected.defaultSensitivity);
      });

      it("should have the correct urlPath", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.urlPath).toBe(expected.urlPath);
      });

      it("should be in the Immigration and Asylum Chamber sub-jurisdiction [6]", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.subJurisdictionIds).toEqual(expected.subJurisdictionIds);
      });

      it("should have the correct English and Welsh friendly names", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.englishFriendlyName).toBe(expected.englishFriendlyName);
        expect(entry?.welshFriendlyName).toBe(expected.welshFriendlyName);
      });

      it("should have the correct shortened friendly name", () => {
        // Act
        const entry = listTypeData.find((item) => item.name === expected.name);

        // Assert
        expect(entry?.shortenedFriendlyName).toBe(expected.shortenedFriendlyName);
      });
    });
  }

  it("should not have a double space in the Welsh Additional Cases friendly name", () => {
    // Act
    const entry = listTypeData.find((item) => item.name === "IAC_DAILY_LIST_ADDITIONAL_CASES");

    // Assert
    expect(entry?.welshFriendlyName).not.toMatch(/ {2}/);
  });
});
