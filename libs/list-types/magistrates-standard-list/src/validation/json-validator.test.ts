import { describe, expect, it } from "vitest";
import { validateMagistratesStandardList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-01-13T09:30:00.000Z" },
  venue: {},
  courtLists: []
};

describe("validateMagistratesStandardList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateMagistratesStandardList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).document;

    const result = validateMagistratesStandardList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).venue;

    const result = validateMagistratesStandardList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).courtLists;

    const result = validateMagistratesStandardList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
