import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCauseListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

describe("renderCauseListData (family-daily-cause-list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as any).mockResolvedValue(undefined);
  });

  it("should render cause list data with correct header information", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Family Daily Cause List",
        version: "1.0"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          town: "Oxford",
          county: "Oxfordshire",
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
      },
      courtLists: []
    };

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Oxford Combined Court Centre");
    expect(result.header.addressLines).toEqual(["St Aldate's", "Oxford", "Oxfordshire", "OX1 1TL"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should render open justice information", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: { line: ["St Aldate's"], postCode: "OX1 1TL" },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
      },
      courtLists: []
    };

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.openJustice.venueName).toBe("Oxford Combined Court Centre");
    expect(result.openJustice.email).toBe("enquiries.oxford.countycourt@justice.gov.uk");
    expect(result.openJustice.phone).toBe("01865 264 200");
  });

  it("should render courtroom sittings with judiciary and duration", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: { line: ["St Aldate's"], postCode: "OX1 1TL" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Oxford Combined Court Centre",
            courtRoom: [
              {
                courtRoomName: "Courtroom 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "Judge A Smith", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:30:00.000Z",
                        hearing: [
                          {
                            hearingType: "Family Hearing",
                            case: [{ caseName: "Brown v Brown", caseNumber: "FA-2025-001" }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect((session as any).formattedJudiciaries).toBe("Judge A Smith");

    const sitting = session.sittings[0];
    expect((sitting as any).time).toBe("10am");
    expect((sitting as any).durationAsHours).toBe(1);
    expect((sitting as any).durationAsMinutes).toBe(30);
  });

  it("should process applicant and respondent parties", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Brown v Brown",
                                caseNumber: "FA-001",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: { individualForenames: "Alice", individualSurname: "Brown" }
                                  },
                                  {
                                    partyRole: "RESPONDENT",
                                    individualDetails: { individualForenames: "Bob", individualSurname: "Brown" }
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).applicant).toBe("Alice Brown");
    expect((caseItem as any).respondent).toBe("Bob Brown");
  });

  it("should handle Welsh locale for content date", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: []
    };

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain("Ionawr");
  });

  it("should handle sitting without end time", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T14:00:00.000Z",
                        hearing: [{ case: [{ caseName: "Test v Test", caseNumber: "T-001" }] }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).durationAsHours).toBe(0);
    expect((sitting as any).durationAsMinutes).toBe(0);
    expect((sitting as any).time).toBe("2pm");
  });

  it("should use Welsh location name when available", async () => {
    (getLocationById as any).mockResolvedValue({ name: "Family Court", welshName: "Llys Teulu" });

    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Family Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: []
    };

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys Teulu");
  });

  it("should format multiple reporting restrictions", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001",
                                reportingRestrictionDetail: ["Section 39", "Section 45"]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).formattedReportingRestriction).toBe("Section 39, Section 45");
  });

  it("should set hearing channel from sitting channel", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        channel: ["VIDEO"],
                        hearing: [{ case: [{ caseName: "Test v Test", caseNumber: "T-001" }] }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("VIDEO");
  });

  it("should fall back to session channel when sitting channel is absent", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [],
                    sessionChannel: ["IN PERSON"],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [{ case: [{ caseName: "Test v Test", caseNumber: "T-001" }] }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("IN PERSON");
  });

  it("should order presiding judge first in formatted judiciaries", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [
                      { johKnownAs: "Judge B", isPresiding: false },
                      { johKnownAs: "Judge A (Presiding)", isPresiding: true }
                    ],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [{ case: [{ caseName: "Test v Test", caseNumber: "T-001" }] }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect((session as any).formattedJudiciaries).toBe("Judge A (Presiding), Judge B");
  });

  it("should return empty string when no judiciaries are present", async () => {
    const inputData = {
      document: { publicationDate: "2025-11-12T09:00:00.000Z" },
      venue: {
        venueName: "Test Court",
        venueAddress: { line: ["Address"], postCode: "AB1 2CD" }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [{ case: [{ caseName: "Test v Test", caseNumber: "T-001" }] }]
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect((session as any).formattedJudiciaries).toBe("");
  });
});
