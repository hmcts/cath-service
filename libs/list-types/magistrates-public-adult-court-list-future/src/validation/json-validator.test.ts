import { describe, expect, it } from "vitest";
import { validateMagistratesPublicAdultCourtListFuture } from "./json-validator.js";

describe("validateMagistratesPublicAdultCourtListFuture", () => {
  it("should validate a correct magistrates public adult court list", () => {
    const validData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Magistrates Public Adult Court List",
        version: "1.0"
      },
      venue: {
        venueName: "Oxford Magistrates' Court",
        venueAddress: {
          line: ["The Law Courts"],
          town: "Oxford",
          postCode: "OX1 1TL"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Oxford Magistrates' Court",
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
                                caseNumber: "MAG-2025-001",
                                party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "John", individualSurname: "Smith" } }]
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

    const result = validateMagistratesPublicAdultCourtListFuture(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schemaVersion).toBe("1.0");
  });

  it("should return errors for missing required fields", () => {
    const result = validateMagistratesPublicAdultCourtListFuture({ document: { publicationDate: "2025-11-12T09:00:00.000Z" } });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for invalid publication date format", () => {
    const result = validateMagistratesPublicAdultCourtListFuture({
      document: { publicationDate: "invalid-date" },
      venue: { venueName: "Test Court", venueAddress: { line: ["Address"], postCode: "AB1 2CD" } },
      courtLists: []
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for a case missing the case number", () => {
    const result = validateMagistratesPublicAdultCourtListFuture({
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: { venueName: "Test Court", venueAddress: { line: ["Address"], postCode: "AB1 2CD" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ sittingStart: "2025-11-12T10:00:00.000Z", hearing: [{ case: [{}] }] }] }] }]
          }
        }
      ]
    });

    expect(result.isValid).toBe(false);
  });
});
