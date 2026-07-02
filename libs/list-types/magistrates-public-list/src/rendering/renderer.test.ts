import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseVenue = {
  venueName: "Birmingham Magistrates Court",
  venueAddress: {
    line: ["Victoria Law Courts"],
    town: "Birmingham",
    postCode: "B4 6QA"
  },
  venueContact: {
    venueTelephone: "0121 681 3300",
    venueEmail: "enquiries.birmingham.mc@justice.gov.uk"
  }
};

const baseDocument = {
  publicationDate: "2025-11-12T09:00:00.000Z"
};

describe("renderMagistratesListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as any).mockResolvedValue(undefined);
  });

  it("should render header information correctly", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    expect(result.header.locationName).toBe("Birmingham Magistrates Court");
    expect(result.header.addressLines).toEqual(["Victoria Law Courts", "Birmingham", "B4 6QA"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should render open justice information", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    expect(result.openJustice.venueName).toBe("Birmingham Magistrates Court");
    expect(result.openJustice.email).toBe("enquiries.birmingham.mc@justice.gov.uk");
    expect(result.openJustice.phone).toBe("0121 681 3300");
  });

  it("should format content date in Welsh locale", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    // Assert
    expect(result.header.contentDate).toContain("Ionawr");
  });

  it("should use Welsh venue name when locale is cy and Welsh name available", async () => {
    // Arrange
    (getLocationById as any).mockResolvedValue({ name: "Birmingham MC", welshName: "Llys Ynadon Birmingham" });
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    // Assert
    expect(result.header.locationName).toBe("Llys Ynadon Birmingham");
  });

  it("should fall back to JSON venue name when location not found", async () => {
    // Arrange
    (getLocationById as any).mockResolvedValue(null);
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    expect(result.header.locationName).toBe("Birmingham Magistrates Court");
  });

  it("should format sitting time correctly", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T14:30:00.000Z",
                        sittingEnd: "2025-11-12T15:00:00.000Z",
                        hearing: [{ case: [{ caseNumber: "MAG-001" }] }]
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).time).toBe("2:30pm");
  });

  it("should extract defendant name from DEFENDANT party role", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
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
                            case: [
                              {
                                caseNumber: "MAG-001",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "John",
                                      individualSurname: "Smith"
                                    }
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).defendantName).toBe("John Smith");
  });

  it("should handle sitting without end time", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [{ case: [{ caseNumber: "MAG-001" }] }]
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).durationAsHours).toBe(0);
    expect((sitting as any).durationAsMinutes).toBe(0);
  });

  it("should extract defendant name from ACCUSED party role", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
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
                            case: [
                              {
                                caseNumber: "MAG-002",
                                party: [
                                  {
                                    partyRole: "ACCUSED",
                                    individualDetails: {
                                      individualForenames: "Jane",
                                      individualSurname: "Doe"
                                    }
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).defendantName).toBe("Jane Doe");
  });

  it("should join multiple defendants with comma when case has multiple defendant parties", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
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
                            case: [
                              {
                                caseNumber: "MAG-003",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Alice", individualSurname: "Brown" }
                                  },
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Bob", individualSurname: "Green" }
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).defendantName).toBe("Alice Brown, Bob Green");
  });

  it("should include county in address lines when present", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: {
        ...baseVenue,
        venueAddress: {
          line: ["Victoria Law Courts"],
          town: "Birmingham",
          county: "West Midlands",
          postCode: "B4 6QA"
        }
      },
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    expect(result.header.addressLines).toEqual(["Victoria Law Courts", "Birmingham", "West Midlands", "B4 6QA"]);
  });

  it("should format publication time with minutes when minutes are non-zero", async () => {
    // Arrange
    const inputData = {
      document: { publicationDate: "2025-11-12T09:30:00.000Z" },
      venue: baseVenue,
      courtLists: []
    };

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9:30am");
  });

  it("should use sitting channel when available", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        channel: ["VIDEO"],
                        hearing: [{ case: [{ caseNumber: "MAG-001" }] }]
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("VIDEO");
  });

  it("should fall back to session channel when sitting channel is absent", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sessionChannel: ["TELEPHONE"],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [{ case: [{ caseNumber: "MAG-001" }] }]
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("TELEPHONE");
  });

  it("should format reporting restrictions on case item", async () => {
    // Arrange
    const inputData = {
      document: baseDocument,
      venue: baseVenue,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Birmingham Magistrates Court",
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
                            case: [
                              {
                                caseNumber: "MAG-001",
                                reportingRestrictionDetail: ["Restriction A", "Restriction B"]
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

    // Act
    const result = await renderMagistratesListData(inputData, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    // Assert
    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).formattedReportingRestriction).toBe("Restriction A, Restriction B");
  });
});
