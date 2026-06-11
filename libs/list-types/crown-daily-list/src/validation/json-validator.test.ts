import { describe, expect, it } from "vitest";
import { validateCrownDailyList } from "./json-validator.js";

describe("validateCrownDailyList", () => {
  it("should validate a correct crown daily list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Crown Daily List",
        version: "1.0"
      },
      venue: {
        venueName: "Crown Court at Leeds",
        venueAddress: {
          line: ["1 Oxford Row"],
          town: "Leeds",
          postCode: "LS1 3BG"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
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
                            hearingDescription: "Trial",
                            case: [
                              {
                                caseNumber: "T20250001"
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

    const result = validateCrownDailyList(validData);

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

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const invalidData = {
      document: {
        publicationDate: "not-a-date"
      },
      venue: {
        venueName: "Crown Court at Leeds",
        venueAddress: {
          line: ["1 Oxford Row"],
          postCode: "LS1 3BG"
        }
      },
      courtLists: []
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const invalidData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      courtLists: []
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing courtRoomName in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Leeds", venueAddress: { line: ["1 Oxford Row"], postCode: "LS1 3BG" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                session: [{ sittings: [{ sittingStart: "2025-11-12T10:00:00.000Z", hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing sittingStart in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Leeds", venueAddress: { line: ["1 Oxford Row"], postCode: "LS1 3BG" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [{ sittings: [{ hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
