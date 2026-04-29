import { describe, expect, it } from "vitest";
import { validateRadioSelection, validateSensitivity, validateThirdPartyUserName } from "./validation.js";

describe("validateThirdPartyUserName", () => {
  it("should return error when name is undefined", () => {
    const result = validateThirdPartyUserName(undefined);
    expect(result).toEqual({ href: "#name" });
  });

  it("should return error when name is empty string", () => {
    const result = validateThirdPartyUserName("");
    expect(result).toEqual({ href: "#name" });
  });

  it("should return error when name is only whitespace", () => {
    const result = validateThirdPartyUserName("   ");
    expect(result).toEqual({ href: "#name" });
  });

  it("should return error when name exceeds 255 characters", () => {
    const longName = "a".repeat(256);
    const result = validateThirdPartyUserName(longName);
    expect(result).toEqual({ href: "#name" });
  });

  it("should return null for valid name", () => {
    const result = validateThirdPartyUserName("Valid Name");
    expect(result).toBeNull();
  });

  it("should return null for name with 255 characters", () => {
    const maxLengthName = "a".repeat(255);
    const result = validateThirdPartyUserName(maxLengthName);
    expect(result).toBeNull();
  });

  it("should return null for name with leading/trailing spaces that trims to valid length", () => {
    const result = validateThirdPartyUserName("  Valid Name  ");
    expect(result).toBeNull();
  });
});

describe("validateRadioSelection", () => {
  it("should return error when value is undefined", () => {
    const result = validateRadioSelection(undefined);
    expect(result).toEqual({ href: "#confirm-delete" });
  });

  it("should return error when value is empty string", () => {
    const result = validateRadioSelection("");
    expect(result).toEqual({ href: "#confirm-delete" });
  });

  it("should return null for yes selection", () => {
    const result = validateRadioSelection("yes");
    expect(result).toBeNull();
  });

  it("should return null for no selection", () => {
    const result = validateRadioSelection("no");
    expect(result).toBeNull();
  });
});

describe("validateSensitivity", () => {
  it("should return error when value is undefined", () => {
    const result = validateSensitivity(undefined);
    expect(result).toEqual({ href: "#sensitivity" });
  });

  it("should return error when value is empty string", () => {
    const result = validateSensitivity("");
    expect(result).toEqual({ href: "#sensitivity" });
  });

  it("should return error for invalid sensitivity value", () => {
    const result = validateSensitivity("INVALID");
    expect(result).toEqual({ href: "#sensitivity" });
  });

  it("should return null for PUBLIC", () => {
    const result = validateSensitivity("PUBLIC");
    expect(result).toBeNull();
  });

  it("should return null for PRIVATE", () => {
    const result = validateSensitivity("PRIVATE");
    expect(result).toBeNull();
  });

  it("should return null for CLASSIFIED", () => {
    const result = validateSensitivity("CLASSIFIED");
    expect(result).toBeNull();
  });
});
