import { describe, expect, it } from "vitest";
import { validateSjpPublicList } from "./json-validator.js";

describe("validateSjpPublicList", () => {
  it("should validate a correct SJP public list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-28T09:00:00Z"
      },
      courtLists: []
    };

    const result = validateSjpPublicList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schemaVersion).toBe("1.0");
  });

  it("should return errors for missing required fields", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      }
    };

    const result = validateSjpPublicList(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const invalidData = {
      document: {
        publicationDate: "invalid-date"
      },
      courtLists: []
    };

    const result = validateSjpPublicList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing courtLists", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      }
    };

    const result = validateSjpPublicList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should validate SJP public list with minimal required fields", () => {
    const minimalData = {
      document: {
        publicationDate: "2025-11-28T09:00:00Z"
      },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: []
              }
            ]
          }
        }
      ]
    };

    const result = validateSjpPublicList(minimalData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
