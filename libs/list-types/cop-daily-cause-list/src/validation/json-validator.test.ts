import { describe, expect, it } from "vitest";
import { validateCopDailyCauseList } from "./json-validator.js";

// Fully-hydrated fixture satisfying every `required` array at every nesting level
// of cop-daily-cause-list.json:
//   root(document, venue, courtLists)
//   → document(publicationDate)
//   → venue(venueName, venueContact) → venueContact(venueEmail, venueTelephone)
//   → courtLists[](courtHouse) → courtHouse(courtHouseName, courtRoom)
//   → courtRoom[](courtRoomName, session) → session[](sittings)
//   → sittings[](sittingStart, sittingEnd, hearing) → hearing[](case) → case[](caseNumber)
const VALID_DATA = {
  document: {
    publicationDate: "2025-01-28T10:00:00Z"
  },
  venue: {
    venueName: "Test Court",
    venueContact: {
      venueEmail: "court@moj.gov.uk",
      venueTelephone: "01772 844700"
    }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Test Courthouse",
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-28T10:00:00Z",
                    sittingEnd: "2025-01-28T11:00:00Z",
                    hearing: [
                      {
                        hearingType: "Directions",
                        case: [
                          {
                            caseNumber: "12345",
                            caseName: "Re X",
                            caseType: "COP",
                            reportingRestrictions: "Section 11 applies"
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

describe("validateCopDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when publicationDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.publicationDate;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venueName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueName;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venueContact is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueContact;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venueEmail is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueContact.venueEmail;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venueTelephone is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueContact.venueTelephone;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtHouseName;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoomName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].courtRoomName;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittingStart is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingStart;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittingEnd is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingEnd;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearing is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseNumber;

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when a string field contains HTML tags", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseName = "<script>alert('x')</script>";

    const result = validateCopDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
