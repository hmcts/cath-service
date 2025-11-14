import { describe, expect, it } from "vitest";
import { formatDate, formatDateAndLocale, formatDateRange, parseDate } from "./date-utils.js";

describe("formatDateAndLocale", () => {
  describe("English locale (en-GB)", () => {
    it("should format date correctly for en locale", () => {
      const result = formatDateAndLocale("2025-04-12", "en");
      expect(result).toBe("12 April 2025");
    });

    it("should handle different month", () => {
      const result = formatDateAndLocale("2025-01-05", "en");
      expect(result).toBe("05 January 2025");
    });

    it("should handle end of year date", () => {
      const result = formatDateAndLocale("2025-12-31", "en");
      expect(result).toBe("31 December 2025");
    });

    it("should handle beginning of year date", () => {
      const result = formatDateAndLocale("2025-01-01", "en");
      expect(result).toBe("01 January 2025");
    });
  });

  describe("Welsh locale (cy-GB)", () => {
    it("should format date correctly for cy locale", () => {
      const result = formatDateAndLocale("2025-04-12", "cy");
      expect(result).toBe("12 Ebrill 2025");
    });

    it("should handle different month in Welsh", () => {
      const result = formatDateAndLocale("2025-01-05", "cy");
      expect(result).toBe("05 Ionawr 2025");
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

describe("formatDate", () => {
  describe("Valid dates", () => {
    it("should format date correctly with single-digit day and month", () => {
      const result = formatDate({ day: "5", month: "4", year: "2025" });
      expect(result).toBe("5 April 2025");
    });

    it("should format date correctly with double-digit day and month", () => {
      const result = formatDate({ day: "23", month: "10", year: "2025" });
      expect(result).toBe("23 October 2025");
    });

    it("should handle beginning of year", () => {
      const result = formatDate({ day: "01", month: "01", year: "2025" });
      expect(result).toBe("1 January 2025");
    });

    it("should handle end of year", () => {
      const result = formatDate({ day: "31", month: "12", year: "2025" });
      expect(result).toBe("31 December 2025");
    });

    it("should format February date", () => {
      const result = formatDate({ day: "14", month: "02", year: "2025" });
      expect(result).toBe("14 February 2025");
    });

    it("should format date with padded values", () => {
      const result = formatDate({ day: "05", month: "03", year: "2025" });
      expect(result).toBe("5 March 2025");
    });

    it("should handle leap year date", () => {
      const result = formatDate({ day: "29", month: "02", year: "2024" });
      expect(result).toBe("29 February 2024");
    });

    it("should handle different years", () => {
      const result = formatDate({ day: "15", month: "06", year: "2030" });
      expect(result).toBe("15 June 2030");
    });
  });

  describe("Edge cases", () => {
    it("should handle day without leading zero", () => {
      const result = formatDate({ day: "7", month: "08", year: "2025" });
      expect(result).toBe("7 August 2025");
    });

    it("should handle month without leading zero", () => {
      const result = formatDate({ day: "15", month: "9", year: "2025" });
      expect(result).toBe("15 September 2025");
    });

    it("should format all months correctly", () => {
      const months = [
        { month: "01", name: "January" },
        { month: "02", name: "February" },
        { month: "03", name: "March" },
        { month: "04", name: "April" },
        { month: "05", name: "May" },
        { month: "06", name: "June" },
        { month: "07", name: "July" },
        { month: "08", name: "August" },
        { month: "09", name: "September" },
        { month: "10", name: "October" },
        { month: "11", name: "November" },
        { month: "12", name: "December" }
      ];

      for (const { month, name } of months) {
        const result = formatDate({ day: "15", month, year: "2025" });
        expect(result).toBe(`15 ${name} 2025`);
      }
    });
  });
});

describe("formatDateRange", () => {
  describe("Valid date ranges", () => {
    it("should format date range correctly", () => {
      const from = { day: "23", month: "10", year: "2025" };
      const to = { day: "30", month: "10", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("23 October 2025 to 30 October 2025");
    });

    it("should handle range within same month", () => {
      const from = { day: "01", month: "04", year: "2025" };
      const to = { day: "15", month: "04", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("1 April 2025 to 15 April 2025");
    });

    it("should handle range across different months", () => {
      const from = { day: "25", month: "03", year: "2025" };
      const to = { day: "05", month: "04", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("25 March 2025 to 5 April 2025");
    });

    it("should handle range across different years", () => {
      const from = { day: "20", month: "12", year: "2025" };
      const to = { day: "10", month: "01", year: "2026" };
      const result = formatDateRange(from, to);
      expect(result).toBe("20 December 2025 to 10 January 2026");
    });

    it("should handle single day range", () => {
      const from = { day: "15", month: "06", year: "2025" };
      const to = { day: "15", month: "06", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("15 June 2025 to 15 June 2025");
    });

    it("should handle range at year boundary", () => {
      const from = { day: "31", month: "12", year: "2025" };
      const to = { day: "01", month: "01", year: "2026" };
      const result = formatDateRange(from, to);
      expect(result).toBe("31 December 2025 to 1 January 2026");
    });

    it("should handle range with single-digit days", () => {
      const from = { day: "1", month: "01", year: "2025" };
      const to = { day: "9", month: "01", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("1 January 2025 to 9 January 2025");
    });

    it("should handle range spanning multiple months", () => {
      const from = { day: "15", month: "02", year: "2025" };
      const to = { day: "20", month: "05", year: "2025" };
      const result = formatDateRange(from, to);
      expect(result).toBe("15 February 2025 to 20 May 2025");
    });
  });
});
