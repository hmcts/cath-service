import { describe, expect, it } from "vitest";
import { getLondonDay } from "./london-day.js";

const HOUR_MS = 60 * 60 * 1000;

describe("getLondonDay", () => {
  it.each([
    {
      scenario: "a GMT day",
      now: "2026-01-15T10:00:00.000Z",
      start: "2026-01-15T00:00:00.000Z",
      end: "2026-01-16T00:00:00.000Z",
      contentDate: "2026-01-15T00:00:00.000Z"
    },
    {
      scenario: "a BST late-night UTC time that is already the next London day",
      now: "2026-06-01T23:30:00.000Z",
      start: "2026-06-01T23:00:00.000Z",
      end: "2026-06-02T23:00:00.000Z",
      contentDate: "2026-06-02T00:00:00.000Z"
    },
    {
      scenario: "a BST early-morning time",
      now: "2026-06-02T00:30:00.000Z",
      start: "2026-06-01T23:00:00.000Z",
      end: "2026-06-02T23:00:00.000Z",
      contentDate: "2026-06-02T00:00:00.000Z"
    }
  ])("should return the London day bounds for $scenario", ({ now, start, end, contentDate }) => {
    // Arrange
    const nowDate = new Date(now);

    // Act
    const day = getLondonDay(nowDate);

    // Assert
    expect(day.start.toISOString()).toBe(start);
    expect(day.end.toISOString()).toBe(end);
    expect(day.contentDate.toISOString()).toBe(contentDate);
  });

  it("should return a 25 hour day when the clocks go back", () => {
    // Arrange
    const now = new Date("2026-10-25T12:00:00.000Z");

    // Act
    const day = getLondonDay(now);

    // Assert
    expect(day.start.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(day.end.getTime() - day.start.getTime()).toBe(25 * HOUR_MS);
    expect(day.contentDate.toISOString()).toBe("2026-10-25T00:00:00.000Z");
  });

  it("should return a 23 hour day when the clocks go forward", () => {
    // Arrange
    const now = new Date("2026-03-29T12:00:00.000Z");

    // Act
    const day = getLondonDay(now);

    // Assert
    expect(day.start.toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(day.end.getTime() - day.start.getTime()).toBe(23 * HOUR_MS);
  });
});
