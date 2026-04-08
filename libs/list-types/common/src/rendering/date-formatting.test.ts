import { describe, expect, it } from "vitest";
import { formatDdMmYyyyDate, formatDisplayDate, formatLastUpdatedDateTime, normalizeTime } from "./date-formatting.js";

describe("date-formatting", () => {
  describe("formatDisplayDate", () => {
    it("should format date in English locale", () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const result = formatDisplayDate(date, "en");
      expect(result).toBe("15 January 2026");
    });

    it("should format date in Welsh locale", () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const result = formatDisplayDate(date, "cy");
      expect(result).toBe("15 Ionawr 2026");
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

    it("should handle single digit day and month", () => {
      const result = formatDdMmYyyyDate("05/03/2026", "en");
      expect(result).toBe("5 March 2026");
    });
  });
});
