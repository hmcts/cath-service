import { describe, expect, it } from "vitest";
import { validateCivilFamilyCauseList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-01-01T10:00:00.000Z" },
  venue: {
    venueName: "Test Court",
    venueAddress: { line: ["Line 1"], postCode: "AB1 2CD" },
    venueContact: { venueTelephone: "01234567890", venueEmail: "test@example.com" }
  },
  courtLists: []
};

describe("validateCivilFamilyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCivilFamilyCauseList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.document;

    const result = validateCivilFamilyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.venue;

    const result = validateCivilFamilyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.courtLists;

    const result = validateCivilFamilyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
