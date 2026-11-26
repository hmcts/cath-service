import { describe, expect, it } from "vitest";
import { isWithinDisplayWindow } from "./display-window.js";

const NOW = new Date("2026-09-14T12:00:00.000Z");

describe("isWithinDisplayWindow", () => {
  it("should return true when now falls between both dates", () => {
    // Arrange
    const from = new Date("2026-09-13T00:00:00.000Z");
    const to = new Date("2026-09-15T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(from, to, NOW);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false when now is before displayFrom", () => {
    // Arrange
    const from = new Date("2026-09-15T00:00:00.000Z");
    const to = new Date("2026-09-16T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(from, to, NOW);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when now is after displayTo", () => {
    // Arrange
    const from = new Date("2026-09-12T00:00:00.000Z");
    const to = new Date("2026-09-13T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(from, to, NOW);

    // Assert
    expect(result).toBe(false);
  });

  it("should treat a null displayFrom as unbounded at the start", () => {
    // Arrange
    const to = new Date("2026-09-15T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(null, to, NOW);

    // Assert
    expect(result).toBe(true);
  });

  it("should treat a null displayTo as unbounded at the end", () => {
    // Arrange
    const from = new Date("2026-01-01T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(from, null, NOW);

    // Assert
    expect(result).toBe(true);
  });

  it("should return true when both dates are null", () => {
    // Act
    const result = isWithinDisplayWindow(null, null, NOW);

    // Assert
    expect(result).toBe(true);
  });

  it("should still enforce a null displayFrom window's upper bound", () => {
    // Arrange
    const to = new Date("2026-09-13T00:00:00.000Z");

    // Act
    const result = isWithinDisplayWindow(null, to, NOW);

    // Assert
    expect(result).toBe(false);
  });

  it("should treat undefined dates as unbounded", () => {
    // Act
    const result = isWithinDisplayWindow(undefined, undefined, NOW);

    // Assert
    expect(result).toBe(true);
  });

  it("should default now to the current time", () => {
    // Arrange
    const from = new Date(Date.now() - 1000);
    const to = new Date(Date.now() + 60_000);

    // Act
    const result = isWithinDisplayWindow(from, to);

    // Assert
    expect(result).toBe(true);
  });
});
