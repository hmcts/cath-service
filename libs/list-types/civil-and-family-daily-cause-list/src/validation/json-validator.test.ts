import { describe, expect, it } from "vitest";
import { validateCivilFamilyCauseList } from "./json-validator.js";

describe("validateCivilFamilyCauseList", () => {
  it("should validate a correct civil and family cause list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Civil and Family Daily Cause List",
        version: "1.0"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          town: "Oxford",
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
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
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            hearingType: "Family Hearing",
                            case: [
                              {
                                caseName: "Brown v Brown",
                                caseNumber: "CF-2025-001"
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

    const result = validateCivilFamilyCauseList(validData);

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

    const result = validateCivilFamilyCauseList(invalidData);

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
        },
        venueContact: {
          venueTelephone: "01234567890",
          venueEmail: "test@example.com"
        }
      },
      courtLists: []
    };

    const result = validateCivilFamilyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      courtLists: []
    };

    const result = validateCivilFamilyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
