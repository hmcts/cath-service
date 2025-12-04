import { describe, expect, it } from "vitest";
import { dateFilter } from "./date.js";

describe("dateFilter", () => {
  it("should format dates in long format by default", () => {
    const date = new Date("2024-03-15");
    expect(dateFilter(date)).toBe("15 March 2024");
  });

  it("should format dates in short format when specified", () => {
    const date = new Date("2024-03-15");
    expect(dateFilter(date, "short")).toBe("15/03/2024");
  });

  it("should handle string dates", () => {
    expect(dateFilter("2024-03-15")).toBe("15 March 2024");
    expect(dateFilter("2024-03-15", "short")).toBe("15/03/2024");
  });

  it("should handle ISO date strings", () => {
    expect(dateFilter("2024-03-15T10:30:00Z")).toBe("15 March 2024");
    expect(dateFilter("2024-12-25T00:00:00Z")).toBe("25 December 2024");
  });

  it("should return empty string for invalid values", () => {
    expect(dateFilter(null as unknown as Date)).toBe("");
    expect(dateFilter(undefined as unknown as Date)).toBe("");
    expect(dateFilter("")).toBe("");
  });

  it("should handle different date formats", () => {
    expect(dateFilter(new Date("January 1, 2024"))).toBe("1 January 2024");
    expect(dateFilter(new Date("2024-01-01"))).toBe("1 January 2024");
    expect(dateFilter(new Date(2024, 0, 1))).toBe("1 January 2024");
  });

  it("should format dates with single digit days correctly", () => {
    expect(dateFilter("2024-03-05")).toBe("5 March 2024");
    expect(dateFilter("2024-03-05", "short")).toBe("05/03/2024");
  });

  it("should format dates in compact format when specified", () => {
    const date = new Date("2024-03-15");
    expect(dateFilter(date, "compact")).toBe("15 Mar 2024");
  });

  it("should format dates in compact format with leading zero for single digit days", () => {
    expect(dateFilter("2024-03-05", "compact")).toBe("05 Mar 2024");
    expect(dateFilter("2025-12-03", "compact")).toBe("03 Dec 2025");
  });

  it("should format dates in compact format with different months", () => {
    expect(dateFilter("2024-01-01", "compact")).toBe("01 Jan 2024");
    expect(dateFilter("2024-02-15", "compact")).toBe("15 Feb 2024");
    expect(dateFilter("2024-12-25", "compact")).toBe("25 Dec 2024");
  });
});
