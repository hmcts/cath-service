import { describe, expect, it } from "vitest";
import { formatAccusedDateOfBirth } from "./accused-date-of-birth.js";

describe("formatAccusedDateOfBirth", () => {
  it("should return the date of birth as sent with the age when both are present", () => {
    // Act
    const result = formatAccusedDateOfBirth("15/03/1985", 40);

    // Assert
    expect(result).toBe("15/03/1985 (40)");
  });

  it("should return a value the parser can't read as sent", () => {
    // Act
    const result = formatAccusedDateOfBirth("unknown", 35);

    // Assert
    expect(result).toBe("unknown (35)");
  });

  it("should return the date of birth alone when there is no age", () => {
    // Act
    const result = formatAccusedDateOfBirth("15/03/1985", null);

    // Assert
    expect(result).toBe("15/03/1985");
  });

  it("should return an empty string when there is an age but no date of birth", () => {
    // Act
    const result = formatAccusedDateOfBirth(null, 40);

    // Assert
    expect(result).toBe("");
  });

  it("should keep an age of zero next to a date of birth", () => {
    // Act
    const result = formatAccusedDateOfBirth("01/01/2025", 0);

    // Assert
    expect(result).toBe("01/01/2025 (0)");
  });

  it("should return an empty string when both are missing", () => {
    // Act
    const result = formatAccusedDateOfBirth(null, null);

    // Assert
    expect(result).toBe("");
  });
});
