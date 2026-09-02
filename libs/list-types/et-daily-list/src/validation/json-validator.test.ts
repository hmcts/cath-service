import { describe, expect, it } from "vitest";
import { validateEtDailyList } from "./json-validator.js";

const VALID_DATA = {
  document: { publicationDate: "2025-01-01T10:00:00.000Z" },
  venue: {
    venueName: "Test Employment Tribunal",
    venueContact: { venueTelephone: "01234567890", venueEmail: "test@example.com" }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Test Court House",
        courtHouseAddress: { line: ["Line 1"], town: "Town", county: "County", postCode: "AB1 2CD" },
        courtRoom: [
          {
            courtRoomName: "Room 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-01T09:00:00.000Z",
                    sittingEnd: "2025-01-01T17:00:00.000Z",
                    channel: ["VIDEO HEARING"],
                    hearing: [
                      {
                        hearingType: "Preliminary",
                        case: [
                          {
                            caseNumber: "12345",
                            caseSequenceIndicator: "1 of 2",
                            party: [
                              {
                                partyRole: "APPLICANT_PETITIONER",
                                individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" }
                              },
                              {
                                partyRole: "RESPONDENT",
                                organisationDetails: { organisationName: "ACME Ltd" }
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
        ]
      }
    }
  ]
};

describe("validateEtDailyList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    // Act
    const result = validateEtDailyList(data);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when document.publicationDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.publicationDate;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueName;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse.courtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtHouseName;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[0].courtHouse.courtRoom is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom[0].session is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].sittings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[0].sittingStart is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingStart;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[0].sittingEnd is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingEnd;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[0].hearing is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearing[0].hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].hearingType;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearing[0].case is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseNumber;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].party[0].partyRole is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].party[0].partyRole;
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when partyRole is a representative role not allowed by the daily list enum", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].party[0].partyRole = "RESPONDENT_REPRESENTATIVE";
    const result = validateEtDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
