import { describe, expect, it } from "vitest";
import { CATH_RUN_TOKEN, newRunToken, runStartedAt } from "./run.js";

describe("newRunToken", () => {
  it("should make a token the run's courts can be found by", () => {
    // Act
    const token = newRunToken();

    // Assert
    expect(token).toMatch(CATH_RUN_TOKEN);
  });

  it("should make a different token for each run started in the same second", () => {
    // Act
    const tokens = new Set(Array.from({ length: 20 }, () => newRunToken(Date.UTC(2026, 10, 10, 15, 30))));

    // Assert
    expect(tokens.size).toBeGreaterThan(1);
  });
});

describe("runStartedAt", () => {
  it("should give back when the run started, to the second", () => {
    // Arrange
    const started = Date.UTC(2026, 10, 10, 15, 30, 12, 345);

    // Act
    const read = runStartedAt(newRunToken(started));

    // Assert
    expect(read).toBe(Date.UTC(2026, 10, 10, 15, 30, 12));
  });
});
