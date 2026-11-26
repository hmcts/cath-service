import { describe, expect, it } from "vitest";
import { validateIacDailyList } from "./json-validator.js";

// Fully-hydrated fixture satisfying every required array at every nesting level.
// Root is an object: { document, venue, courtLists }.
const VALID_DATA = {
  document: {
    publicationDate: "2026-07-23T09:30:00Z"
  },
  venue: {
    venueName: "Manchester"
  },
  courtLists: [
    {
      courtListName: "Substantive List",
      courtHouse: {
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sessionChannel: ["VIDEO HEARING"],
                sittings: [
                  {
                    sittingStart: "2026-07-23T09:30:00Z",
                    sittingEnd: "2026-07-23T12:30:00Z",
                    hearing: [
                      {
                        case: [
                          {
                            caseNumber: "45684548"
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

describe("validateIacDailyList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when document.publicationDate is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.publicationDate;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue.venueName is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.venue.venueName;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[].courtListName is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtListName;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtLists[].courtHouse is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtHouse.courtRoom is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom[].courtRoomName is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].courtRoomName;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtRoom[].session is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[].sessionChannel is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sessionChannel;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[].sittings is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[].sittingStart is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingStart;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[].sittingEnd is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].sittingEnd;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when sittings[].hearing is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearing[].case is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[].caseNumber is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseNumber;

    // Act
    const result = validateIacDailyList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
