import { describe, expect, it } from "vitest";
import { renderCauseListData } from "./cause-list-renderer.js";

describe("renderCauseListData", () => {
  it("should render cause list data with correct header information", () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z",
        documentName: "Civil and Family Daily Cause List",
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

    const result = renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Oxford Combined Court Centre");
    expect(result.header.addressLines).toEqual(["St Aldate's", "OX1 1TL"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should render open justice information", () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
      },
      courtLists: []
    };

    const result = renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.openJustice.venueName).toBe("Oxford Combined Court Centre");
    expect(result.openJustice.email).toBe("enquiries.oxford.countycourt@justice.gov.uk");
    expect(result.openJustice.phone).toBe("01865 264 200");
  });

  it("should render courtroom sittings correctly", () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
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
                    judiciary: [
                      {
                        johKnownAs: "Judge A Smith",
                        isPresiding: true
                      }
                    ],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            hearingType: "Family Hearing",
                            case: [
                              {
                                caseName: "Brown v Brown",
                                caseNumber: "CF-2025-001"
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

    const result = renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.listData.courtLists).toHaveLength(1);
    const courtRoom = result.listData.courtLists[0].courtHouse.courtRoom[0];
    expect(courtRoom.courtRoomName).toBe("Courtroom 1");

    const session = courtRoom.session[0];
    expect((session as any).formattedJudiciaries).toBe("Judge A Smith");

    const sitting = session.sittings[0];
    expect((sitting as any).time).toBe("10am");
    expect((sitting as any).durationAsHours).toBe(1);
    expect((sitting as any).durationAsMinutes).toBe(0);

    const caseItem = sitting.hearing[0].case[0];
    expect(caseItem.caseName).toBe("Brown v Brown");
    expect(caseItem.caseNumber).toBe("CF-2025-001");
  });

  it("should handle multiple cases in a sitting", () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
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
                    judiciary: [
                      {
                        johKnownAs: "Judge A Smith",
                        isPresiding: true
                      }
                    ],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            hearingType: "Family Hearing",
                            case: [
                              {
                                caseName: "Brown v Brown",
                                caseNumber: "CF-2025-001"
                              },
                              {
                                caseName: "Smith v Smith",
                                caseNumber: "CF-2025-002"
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

    const result = renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const cases = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
    expect(cases).toHaveLength(2);
    expect(cases[0].caseName).toBe("Brown v Brown");
    expect(cases[1].caseName).toBe("Smith v Smith");
  });

  it("should handle reporting restrictions", () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Oxford Combined Court Centre",
        venueAddress: {
          line: ["St Aldate's"],
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865 264 200",
          venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
        }
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
                    judiciary: [],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            hearingType: "Family Hearing",
                            case: [
                              {
                                caseName: "Brown v Brown",
                                caseNumber: "CF-2025-001",
                                reportingRestrictionDetail: ["Section 39 Children and Young Persons Act 1933"]
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

    const result = renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).formattedReportingRestriction).toBe("Section 39 Children and Young Persons Act 1933");
  });
});
