import { describe, expect, it } from "vitest";
import { validateMagistratesStandardList } from "./json-validator.js";

const VALID_DATA = {
  document: {
    publicationDate: "2025-01-13T09:30:00.000Z"
  },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS", "CROWN SQUARE"],
      town: "Manchester",
      county: "Greater Manchester",
      postCode: "M3 3FL"
    }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Manchester Magistrates Court",
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-13T10:00:00.000Z",
                    hearing: []
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

describe("validateMagistratesStandardList", () => {
  it("should return valid for a well-formed document", () => {
    const result = validateMagistratesStandardList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when publicationDate is missing", () => {
    const invalidData = {
      document: {},
      venue: {},
      courtLists: []
    };
    const result = validateMagistratesStandardList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
