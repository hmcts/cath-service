import { describe, expect, it } from "vitest";
import { formatDdMmYyyyDate, formatDisplayDate, formatHHMMTime, formatLastUpdatedDateTime, normalizeTime } from "./date-formatting.js";

describe("date-formatting", () => {
  describe("formatDisplayDate", () => {
    it("should format date in English locale", () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const result = formatDisplayDate(date, "en");
      expect(result).toBe("15 January 2026");
    });

    it("should format single digit day without leading zero", () => {
      const date = new Date(2026, 0, 1); // January 1, 2026
      const result = formatDisplayDate(date, "en");
      expect(result).toBe("1 January 2026");
    });

    it("should format date in Welsh locale", () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const result = formatDisplayDate(date, "cy");
      expect(result).toBe("15 Ionawr 2026");
    });

    it("should format single-digit day without leading zero", () => {
      const date = new Date(2026, 6, 1); // July 1, 2026
      const result = formatDisplayDate(date, "en");
      expect(result).toBe("1 July 2026");
    });

    it("should handle different months", () => {
      const date = new Date(2026, 11, 25); // December 25, 2026
      const result = formatDisplayDate(date, "en");
      expect(result).toBe("25 December 2026");
    });
  });

  describe("formatLastUpdatedDateTime", () => {
    it("should format ISO datetime with minutes", () => {
      const isoDateTime = "2026-01-15T14:30:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.date).toBe("15 January 2026");
      expect(result.time).toBe("2:30pm");
    });

    it("should format ISO datetime without minutes", () => {
      const isoDateTime = "2026-01-15T14:00:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.date).toBe("15 January 2026");
      expect(result.time).toBe("2pm");
    });

    it("should not pad single-digit day", () => {
      const isoDateTime = "2026-07-01T14:30:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.date).toBe("1 July 2026");
    });

    it("should handle morning times", () => {
      const isoDateTime = "2026-01-15T09:45:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.date).toBe("15 January 2026");
      expect(result.time).toBe("9:45am");
    });

    it("should handle midnight", () => {
      const isoDateTime = "2026-01-15T00:00:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.time).toBe("12am");
    });

    it("should handle noon", () => {
      const isoDateTime = "2026-01-15T12:00:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "en");
      expect(result.time).toBe("12pm");
    });

    it("should format date in Welsh locale", () => {
      const isoDateTime = "2026-01-15T14:30:00Z";
      const result = formatLastUpdatedDateTime(isoDateTime, "cy");
      expect(result.date).toBe("15 Ionawr 2026");
      expect(result.time).toBe("2:30pm");
    });
  });

  describe("formatHHMMTime", () => {
    it("should format whole hour AM dropping minutes", () => {
      expect(formatHHMMTime("09:00")).toBe("9am");
    });

    it("should format whole hour PM dropping minutes", () => {
      expect(formatHHMMTime("14:00")).toBe("2pm");
    });

    it("should format time with minutes AM", () => {
      expect(formatHHMMTime("10:05")).toBe("10:05am");
    });

    it("should format time with minutes PM", () => {
      expect(formatHHMMTime("22:30")).toBe("10:30pm");
    });

    it("should format noon as 12pm", () => {
      expect(formatHHMMTime("12:00")).toBe("12pm");
    });

    it("should format midnight as 12am", () => {
      expect(formatHHMMTime("00:00")).toBe("12am");
    });

    it("should return original string for invalid input", () => {
      expect(formatHHMMTime("invalid")).toBe("invalid");
    });
  });

  describe("normalizeTime", () => {
    it("should replace dot with colon", () => {
      expect(normalizeTime("2.30pm")).toBe("2:30pm");
    });

    it("should handle time without dots", () => {
      expect(normalizeTime("2:30pm")).toBe("2:30pm");
    });

    it("should handle empty string", () => {
      expect(normalizeTime("")).toBe("");
    });
  });

  describe("formatDdMmYyyyDate", () => {
    it("should format dd/MM/yyyy date in English", () => {
      const result = formatDdMmYyyyDate("15/01/2026", "en");
      expect(result).toBe("15 January 2026");
    });

    it("should format dd/MM/yyyy date in Welsh", () => {
      const result = formatDdMmYyyyDate("15/01/2026", "cy");
      expect(result).toBe("15 Ionawr 2026");
    });

    it("should handle different months", () => {
      const result = formatDdMmYyyyDate("25/12/2026", "en");
      expect(result).toBe("25 December 2026");
    });

    it("should handle single digit day without leading zero", () => {
      const result = formatDdMmYyyyDate("05/03/2026", "en");
      expect(result).toBe("5 March 2026");
    });

    it("should format an unpadded day and month", () => {
      const result = formatDdMmYyyyDate("5/10/2026", "en");
      expect(result).toBe("5 October 2026");
    });

    it("should use Welsh month names for the cy locale", () => {
      const result = formatDdMmYyyyDate("20/10/2026", "cy");
      expect(result).toBe("20 Hydref 2026");
    });

    it("should return its own output unchanged when called twice", () => {
      // Arrange
      const once = formatDdMmYyyyDate("20/02/2025", "en");

      // Act
      const twice = formatDdMmYyyyDate(once, "en");

      // Assert
      expect(twice).toBe("20 February 2025");
    });

    it.each([
      ["an impossible date", "31/02/2025"],
      ["free text containing dates", "w/c 15/01/2025 to 17/01/2025"],
      ["a case reference", "CO/1234/2025"],
      ["text", "TBC"],
      ["an empty string", ""]
    ])("should return %s unchanged", (_description, value) => {
      const result = formatDdMmYyyyDate(value, "en");
      expect(result).toBe(value);
    });
  });
});
