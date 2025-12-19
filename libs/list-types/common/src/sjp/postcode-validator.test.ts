import { describe, expect, it } from "vitest";
import { validateUkPostcode } from "./postcode-validator.js";

describe("validateUkPostcode", () => {
  it("should return valid for empty postcode", () => {
    const result = validateUkPostcode("");
    expect(result.isValid).toBe(true);
  });

  it("should return valid for undefined postcode", () => {
    const result = validateUkPostcode(undefined);
    expect(result.isValid).toBe(true);
  });

  it("should return valid for standard UK postcode", () => {
    const result = validateUkPostcode("SW1A 1AA");
    expect(result.isValid).toBe(true);
  });

  it("should return valid for postcode without space", () => {
    const result = validateUkPostcode("SW1A1AA");
    expect(result.isValid).toBe(true);
  });

  it("should return valid for different postcode formats", () => {
    expect(validateUkPostcode("M1 1AA").isValid).toBe(true);
    expect(validateUkPostcode("M60 1NW").isValid).toBe(true);
    expect(validateUkPostcode("CR2 6XH").isValid).toBe(true);
    expect(validateUkPostcode("DN55 1PT").isValid).toBe(true);
    expect(validateUkPostcode("W1A 0AX").isValid).toBe(true);
    expect(validateUkPostcode("EC1A 1BB").isValid).toBe(true);
  });

  it("should return valid for case insensitive postcode", () => {
    const result = validateUkPostcode("sw1a 1aa");
    expect(result.isValid).toBe(true);
  });

  it("should return invalid for invalid postcode format", () => {
    const result = validateUkPostcode("INVALID");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Enter a valid postcode");
  });

  it("should return invalid for partial postcode", () => {
    const result = validateUkPostcode("SW1A");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Enter a valid postcode");
  });

  it("should return invalid for numbers only", () => {
    const result = validateUkPostcode("123456");
    expect(result.isValid).toBe(false);
  });

  it("should handle whitespace around postcode", () => {
    const result = validateUkPostcode("  SW1A 1AA  ");
    expect(result.isValid).toBe(true);
  });
});
