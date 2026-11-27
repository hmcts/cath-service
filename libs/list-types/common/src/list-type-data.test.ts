import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

describe("listTypeData", () => {
  describe("ET_DAILY_LIST", () => {
    it("should use the Daily Hearing List names, keep its URL path and default to Public", () => {
      // Arrange
      const name = "ET_DAILY_LIST";

      // Act
      const entry = listTypeData.find((listType) => listType.name === name);

      // Assert
      expect(entry).toMatchObject({
        englishFriendlyName: "Employment Tribunal Daily Hearing List",
        welshFriendlyName: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cyflogaeth",
        shortenedFriendlyName: "ET Daily Hearing List",
        urlPath: "et-daily-list",
        defaultSensitivity: "Public"
      });
    });
  });

  describe("ET_FORTNIGHTLY_PRESS_LIST", () => {
    it("should use the Advance Hearing List names, keep its URL path and default to Public", () => {
      // Arrange
      const name = "ET_FORTNIGHTLY_PRESS_LIST";

      // Act
      const entry = listTypeData.find((listType) => listType.name === name);

      // Assert
      expect(entry).toMatchObject({
        englishFriendlyName: "Employment Tribunal Advance Hearing List",
        welshFriendlyName: "Rhestr Gwrandawiadau Ymlaen llaw y Tribiwnlys Cyflogaeth",
        shortenedFriendlyName: "ET Advance Hearing List",
        urlPath: "et-fortnightly-list",
        defaultSensitivity: "Public"
      });
    });
  });
});
