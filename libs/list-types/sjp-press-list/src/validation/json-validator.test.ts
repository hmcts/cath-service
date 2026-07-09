import { describe, expect, it } from "vitest";
import { validateSjpPressList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-11-28T09:00:00Z" },
  courtLists: []
};

describe("validateSjpPressList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateSjpPressList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).document;

    const result = validateSjpPressList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).courtLists;

    const result = validateSjpPressList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
