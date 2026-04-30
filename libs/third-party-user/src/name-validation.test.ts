import { describe, expect, it } from "vitest";
import { validateName } from "./name-validation.js";

describe("validateName", () => {
  it("should return null for a valid name", () => {
    expect(validateName("Test User")).toBeNull();
  });

  it("should return null for a name with allowed special characters", () => {
    expect(validateName("O'Brien-Smith 2")).toBeNull();
  });

  it("should return an error for an empty string", () => {
    const result = validateName("");
    expect(result).not.toBeNull();
    expect(result?.href).toBe("#name");
    expect(result?.text).toBe("Enter a name");
  });

  it("should return an error for a whitespace-only string", () => {
    const result = validateName("   ");
    expect(result).not.toBeNull();
    expect(result?.text).toBe("Enter a name");
  });

  it("should return an error when name exceeds 255 characters", () => {
    const longName = "a".repeat(256);
    const result = validateName(longName);
    expect(result).not.toBeNull();
    expect(result?.text).toBe("Name must be 255 characters or fewer");
  });

  it("should return null for a name of exactly 255 characters", () => {
    const maxName = "a".repeat(255);
    expect(validateName(maxName)).toBeNull();
  });

  it("should return an error for a name with disallowed characters", () => {
    const result = validateName("Test@User");
    expect(result).not.toBeNull();
    expect(result?.text).toBe("Name must only contain letters, numbers, spaces, hyphens and apostrophes");
  });

  it("should return an error for a name with angle brackets", () => {
    const result = validateName("<script>");
    expect(result).not.toBeNull();
    expect(result?.href).toBe("#name");
  });
});
