import { describe, expect, it } from "vitest";
import { formatDateAndLocale } from "./format-date-and-locale.js";

describe("formatDateAndLocale", () => {
  describe("English locale (en-GB)", () => {
    it("should format date correctly for en locale", () => {
      const result = formatDateAndLocale("2025-04-12", "en");
      expect(result).toBe("12 April 2025");
    });

    it("should handle different month", () => {
      const result = formatDateAndLocale("2025-01-05", "en");
      expect(result).toBe("5 January 2025");
    });

    it("should handle end of year date", () => {
      const result = formatDateAndLocale("2025-12-31", "en");
      expect(result).toBe("31 December 2025");
    });

    it("should handle beginning of year date", () => {
      const result = formatDateAndLocale("2025-01-01", "en");
      expect(result).toBe("1 January 2025");
    });
  });

  describe("Welsh locale (cy-GB)", () => {
    it("should format date correctly for cy locale", () => {
      const result = formatDateAndLocale("2025-04-12", "cy");
      expect(result).toBe("12 Ebrill 2025");
    });

    it("should handle different month in Welsh", () => {
      const result = formatDateAndLocale("2025-01-05", "cy");
      expect(result).toBe("5 Ionawr 2025");
    });

    it("should handle end of year date in Welsh", () => {
      const result = formatDateAndLocale("2025-12-31", "cy");
      expect(result).toBe("31 Rhagfyr 2025");
    });

    it("should handle February in Welsh", () => {
      const result = formatDateAndLocale("2025-02-28", "cy");
      expect(result).toBe("28 Chwefror 2025");
    });

    it("should handle March in Welsh", () => {
      const result = formatDateAndLocale("2025-03-15", "cy");
      expect(result).toBe("15 Mawrth 2025");
    });
  });

  describe("Edge cases", () => {
    it("should default to English for unknown locale", () => {
      const result = formatDateAndLocale("2025-04-12", "fr");
      expect(result).toBe("12 April 2025");
    });

    it("should handle ISO date string with time", () => {
      const result = formatDateAndLocale("2025-04-12T10:30:00Z", "en");
      expect(result).toBe("12 April 2025");
    });
  });
});
