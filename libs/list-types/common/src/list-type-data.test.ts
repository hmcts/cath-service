import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

describe("listTypeData", () => {
  describe("MENTAL_HEALTH_TRIBUNAL_HEARING_LIST entry", () => {
    it("should include a Mental Health Tribunal Daily Hearing List entry", () => {
      // Arrange
      // Act
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Assert
      expect(entry).toBeDefined();
    });

    it("should be a strategic list type", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const isNonStrategic = entry?.isNonStrategic;

      // Assert
      expect(isNonStrategic).toBe(false);
    });

    it("should default sensitivity to Public", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const defaultSensitivity = entry?.defaultSensitivity;

      // Assert
      expect(defaultSensitivity).toBe("Public");
    });

    it("should use the PI_AAD provenance", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const provenance = entry?.provenance;

      // Assert
      expect(provenance).toBe("PI_AAD");
    });

    it("should be linked to the Mental Health Tribunal sub-jurisdiction", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const subJurisdictionIds = entry?.subJurisdictionIds;

      // Assert
      expect(subJurisdictionIds).toEqual([20]);
    });

    it("should set the shortened friendly name to the full friendly name", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const shortenedFriendlyName = entry?.shortenedFriendlyName;

      // Assert
      expect(shortenedFriendlyName).toBe("Mental Health Tribunal Daily Hearing List");
    });

    it("should use the English and Welsh friendly names from the ticket", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const englishFriendlyName = entry?.englishFriendlyName;
      const welshFriendlyName = entry?.welshFriendlyName;

      // Assert
      expect(englishFriendlyName).toBe("Mental Health Tribunal Daily Hearing List");
      expect(welshFriendlyName).toBe("Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl");
    });

    it("should not define a urlPath because it is served as a flat file", () => {
      // Arrange
      const entry = listTypeData.find((lt) => lt.name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST");

      // Act
      const urlPath = entry?.urlPath;

      // Assert
      expect(urlPath).toBeUndefined();
    });
  });

  describe("catalogue integrity", () => {
    it("should not contain duplicate list type names", () => {
      // Arrange
      const names = listTypeData.map((lt) => lt.name);

      // Act
      const uniqueNames = new Set(names);

      // Assert
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
