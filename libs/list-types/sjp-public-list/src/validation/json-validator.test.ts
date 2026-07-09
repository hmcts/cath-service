import { describe, expect, it } from "vitest";
import { validateSjpPublicList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-11-28T09:00:00Z" },
  courtLists: []
};

describe("validateSjpPublicList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateSjpPublicList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).document;

    const result = validateSjpPublicList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).courtLists;

    const result = validateSjpPublicList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
