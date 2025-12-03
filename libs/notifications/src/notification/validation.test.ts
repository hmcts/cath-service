import { describe, expect, it } from "vitest";
import { isValidEmail, validatePublicationEvent } from "./validation.js";

describe("isValidEmail", () => {
  it("should return true for valid email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.user@example.co.uk")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("should return false for invalid email addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("should return false for non-string values", () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
  });

  it("should handle email addresses with whitespace", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
});

describe("validatePublicationEvent", () => {
  it("should return valid for complete publication event", () => {
    const result = validatePublicationEvent({
      publicationId: "pub-123",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date()
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for missing required fields", () => {
    const result = validatePublicationEvent({
      publicationId: "",
      locationId: "",
      locationName: "",
      hearingListName: "",
      publicationDate: null as unknown as Date
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Publication ID is required");
    expect(result.errors).toContain("Location ID is required");
    expect(result.errors).toContain("Location name is required");
    expect(result.errors).toContain("Hearing list name is required");
    expect(result.errors).toContain("Publication date is required");
  });
});
