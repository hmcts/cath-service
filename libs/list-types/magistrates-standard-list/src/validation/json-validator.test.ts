import { describe, expect, it } from "vitest";
import { validateMagistratesStandardList } from "./json-validator.js";

describe("validateMagistratesStandardList", () => {
  it("should validate a correct magistrates standard list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Magistrates Standard List",
        version: "1.0"
      },
      venue: {
        venueName: "Birmingham Magistrates Court",
        venueAddress: {
          line: ["Victoria Law Courts"],
          town: "Birmingham",
          postCode: "B4 6QA"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseNumber: "MAG-2025-001",
                                offence: "Speeding",
                                plea: "Guilty",
                                results: "Fine"
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

    const result = validateMagistratesStandardList(validData);

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

    const result = validateMagistratesStandardList(invalidData);

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

    const result = validateMagistratesStandardList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      courtLists: []
    };

    const result = validateMagistratesStandardList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
