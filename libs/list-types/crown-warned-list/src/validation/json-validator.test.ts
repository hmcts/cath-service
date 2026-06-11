import { describe, expect, it } from "vitest";
import { validateCrownWarnedList } from "./json-validator.js";

describe("validateCrownWarnedList", () => {
  it("should validate a correct crown warned list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Crown Warned List",
        weekCommencing: "2025-11-10",
        version: "1.0"
      },
      venue: {
        venueName: "Crown Court at Birmingham",
        venueAddress: {
          line: ["Newton Street"],
          town: "Birmingham",
          postCode: "B4 7NA"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "For Trial",
                            case: [
                              {
                                caseNumber: "B20250001",
                                fixedFor: "2025-11-12"
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

    const result = validateCrownWarnedList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for missing required fields", () => {
    const result = validateCrownWarnedList({ document: { publicationDate: "2025-11-12T09:00:00.000Z" } });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const result = validateCrownWarnedList({
      document: { publicationDate: "bad-date" },
      venue: { venueName: "Test Court", venueAddress: { line: ["Addr"], postCode: "B1 1AA" } },
      courtLists: []
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing venue", () => {
    const result = validateCrownWarnedList({
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      courtLists: []
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing courtRoomName in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Birmingham", venueAddress: { line: ["Newton Street"], postCode: "B4 7NA" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                session: [{ sittings: [{ sittingStart: "2025-11-12T10:00:00.000Z", hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownWarnedList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing sittingStart in nested structure", () => {
    const invalidData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Crown Court at Birmingham", venueAddress: { line: ["Newton Street"], postCode: "B4 7NA" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [{ sittings: [{ hearing: [] }] }]
              }
            ]
          }
        }
      ]
    };

    const result = validateCrownWarnedList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
