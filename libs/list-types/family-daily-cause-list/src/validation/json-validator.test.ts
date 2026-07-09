import { describe, expect, it } from "vitest";
import { validateFamilyDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-01-01T10:00:00.000Z" },
  venue: {
    venueName: "Test Court",
    venueAddress: { line: ["Line 1"], postCode: "AB1 2CD" }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Test Court House",
        courtRoom: [
          {
            courtRoomName: "Room 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-01T09:00:00.000Z",
                    hearing: [
                      {
                        case: [{ caseName: "Test v Test", caseNumber: "12345" }]
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

describe("validateFamilyDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateFamilyDailyCauseList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when document.publicationDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.publicationDate;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueName;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueAddress is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueAddress;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueAddress.line is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueAddress.line;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueAddress.postCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueAddress.postCode;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse.courtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtHouseName;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse.courtRoom is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom[0].courtRoomName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].courtRoomName;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom[0].session is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].sittings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[0].sittingStart is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingStart;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[0].hearing is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearing[0].case is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseName;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseNumber;
    const result = validateFamilyDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
