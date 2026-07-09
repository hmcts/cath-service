import { describe, expect, it } from "vitest";
import { validateMagistratesPublicList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2020-09-13T23:30:00Z" },
  venue: { venueAddress: { line: ["THE LAW COURTS"], postCode: "PR1 2LL" } },
  courtLists: []
};

describe("validateMagistratesPublicList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateMagistratesPublicList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).document;

    const result = validateMagistratesPublicList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).venue;

    const result = validateMagistratesPublicList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).courtLists;

    const result = validateMagistratesPublicList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
