import { describe, expect, it } from "vitest";
import { validateCrownFirmList } from "./json-validator.js";

describe("validateCrownFirmList", () => {
  it("should validate a correct crown firm list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Crown Firm List",
        version: "1.0"
      },
      venue: {
        venueName: "Crown Court at Manchester",
        venueAddress: {
          line: ["Crown Square"],
          town: "Manchester",
          postCode: "M3 3FL"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "Plea",
                            case: [
                              {
                                caseNumber: "M20250001"
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

    const result = validateCrownFirmList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for missing required fields", () => {
    const result = validateCrownFirmList({ document: { publicationDate: "2025-11-12T09:00:00.000Z" } });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const result = validateCrownFirmList({
      document: { publicationDate: "not-a-date" },
      venue: { venueName: "Test Court", venueAddress: { line: ["Addr"], postCode: "M1 1AA" } },
      courtLists: []
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const result = validateCrownFirmList({
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      courtLists: []
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing courtRoomName in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Manchester", venueAddress: { line: ["Crown Square"], postCode: "M3 3FL" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                session: [{ sittings: [{ sittingStart: "2025-11-12T10:00:00.000Z", hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownFirmList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing sittingStart in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Manchester", venueAddress: { line: ["Crown Square"], postCode: "M3 3FL" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [{ sittings: [{ hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownFirmList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
