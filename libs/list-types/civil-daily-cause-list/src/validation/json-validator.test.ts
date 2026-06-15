import { describe, expect, it } from "vitest";
import { validateCivilDailyCauseList } from "./json-validator.js";

describe("validateCivilDailyCauseList", () => {
  it("should validate a correct civil daily cause list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Civil Daily Cause List",
        version: "1.0"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          town: "Oxford",
          postCode: "OX1 1TL"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Oxford Combined Court Centre",
            courtRoom: [
              {
                courtRoomName: "Courtroom 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Smith v Jones",
                                caseNumber: "CV-2025-001"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    const result = validateCivilDailyCauseList(validData);

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

    const result = validateCivilDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const invalidData = {
      document: {
        publicationDate: "invalid-date"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
      },
      courtLists: []
    };

    const result = validateCivilDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      courtLists: []
    };

    const result = validateCivilDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
