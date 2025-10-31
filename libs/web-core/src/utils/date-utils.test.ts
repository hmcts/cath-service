import { describe, expect, it } from "vitest";
import { formatDateAndLocale, parseDate } from "./date-utils.js";

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

describe("parseDate", () => {
  describe("Valid dates", () => {
    it("should parse a valid date correctly", () => {
      const result = parseDate({ day: "15", month: "6", year: "2025" });
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(5); // 0-indexed
      expect(result?.getFullYear()).toBe(2025);
    });

    it("should handle single-digit day and month", () => {
      const result = parseDate({ day: "1", month: "1", year: "2025" });
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(1);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(2025);
    });

    it("should handle end of month date", () => {
      const result = parseDate({ day: "31", month: "12", year: "2025" });
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(31);
      expect(result?.getMonth()).toBe(11);
      expect(result?.getFullYear()).toBe(2025);
    });

    it("should handle leap year date", () => {
      const result = parseDate({ day: "29", month: "2", year: "2024" });
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(29);
      expect(result?.getMonth()).toBe(1);
      expect(result?.getFullYear()).toBe(2024);
    });
  });

  describe("Invalid dates", () => {
    it("should return null for invalid day", () => {
      const result = parseDate({ day: "32", month: "1", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for invalid month", () => {
      const result = parseDate({ day: "15", month: "13", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for February 29 in non-leap year", () => {
      const result = parseDate({ day: "29", month: "2", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for invalid day in month", () => {
      const result = parseDate({ day: "31", month: "4", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for non-numeric day", () => {
      const result = parseDate({ day: "abc", month: "1", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for non-numeric month", () => {
      const result = parseDate({ day: "15", month: "abc", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for non-numeric year", () => {
      const result = parseDate({ day: "15", month: "1", year: "abc" });
      expect(result).toBeNull();
    });

    it("should return null for negative day", () => {
      const result = parseDate({ day: "-1", month: "1", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for zero day", () => {
      const result = parseDate({ day: "0", month: "1", year: "2025" });
      expect(result).toBeNull();
    });

    it("should return null for zero month", () => {
      const result = parseDate({ day: "15", month: "0", year: "2025" });
      expect(result).toBeNull();
    });
  });
});
