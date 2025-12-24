import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCauseListData } from "./renderer.js";

// Mock the location module to avoid database calls in unit tests
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

describe("renderCauseListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation - returns undefined so venue name from JSON is used
    (getLocationById as any).mockResolvedValue(undefined);
  });
  it("should render cause list data with correct header information", async () => {
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Oxford Combined Court Centre");
    expect(result.header.addressLines).toEqual(["St Aldate's", "OX1 1TL"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should render open justice information", async () => {
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.openJustice.venueName).toBe("Oxford Combined Court Centre");
    expect(result.openJustice.email).toBe("enquiries.oxford.countycourt@justice.gov.uk");
    expect(result.openJustice.phone).toBe("01865 264 200");
  });

  it("should render courtroom sittings correctly", async () => {
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

    const result = await renderCauseListData(inputData, {
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

  it("should handle multiple cases in a sitting", async () => {
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const cases = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
    expect(cases).toHaveLength(2);
    expect(cases[0].caseName).toBe("Brown v Brown");
    expect(cases[1].caseName).toBe("Smith v Smith");
  });

  it("should handle reporting restrictions", async () => {
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).formattedReportingRestriction).toBe("Section 39 Children and Young Persons Act 1933");
  });

  it("should format time correctly for afternoon", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T14:30:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                        sittingStart: "2025-11-12T14:30:00.000Z",
                        sittingEnd: "2025-11-12T15:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001"
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

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).time).toBe("2:30pm");
  });

  it("should handle sitting without end time", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001"
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

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).durationAsHours).toBe(0);
    expect((sitting as any).durationAsMinutes).toBe(0);
  });

  it("should format judiciaries with presiding judge first", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                      {
                        johKnownAs: "Judge B",
                        isPresiding: false
                      },
                      {
                        johKnownAs: "Judge A",
                        isPresiding: true
                      }
                    ],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001"
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

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect((session as any).formattedJudiciaries).toBe("Judge A, Judge B");
  });

  it("should handle session hearing channel", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                    sessionChannel: ["VIDEO HEARING"],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001"
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

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("VIDEO HEARING");
  });

  it("should handle Welsh locale", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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

  it("should handle sitting channel override", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                    sessionChannel: ["VIDEO HEARING"],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        sittingEnd: "2025-11-12T11:00:00.000Z",
                        channel: ["IN PERSON"],
                        hearing: [
                          {
                            case: [
                              {
                                caseName: "Test v Test",
                                caseNumber: "T-001"
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

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect((sitting as any).caseHearingChannel).toBe("IN PERSON");
  });

  it("should process parties with applicant", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                caseName: "Smith v Jones",
                                caseNumber: "T-001",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: {
                                      title: "Mr",
                                      individualForenames: "John",
                                      individualMiddleName: "Paul",
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).applicant).toBe("Mr John Paul Smith");
  });

  it("should process parties with respondent representative", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                caseName: "Smith v Jones",
                                caseNumber: "T-001",
                                party: [
                                  {
                                    partyRole: "RESPONDENT_REPRESENTATIVE",
                                    organisationDetails: {
                                      organisationName: "Legal LLP"
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).respondentRepresentative).toBe("Legal LLP");
  });

  it("should process parties with applicant representative", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                caseName: "Smith v Jones",
                                caseNumber: "T-001",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER_REPRESENTATIVE",
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).applicantRepresentative).toBe("Jane Doe");
  });

  it("should handle multiple parties in same role", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                caseName: "Multiple v Test",
                                caseNumber: "T-001",
                                party: [
                                  {
                                    partyRole: "RESPONDENT",
                                    individualDetails: {
                                      individualForenames: "John",
                                      individualSurname: "Smith"
                                    }
                                  },
                                  {
                                    partyRole: "RESPONDENT",
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).respondent).toBe("John Smith, Jane Doe");
  });

  it("should handle party with alternative role format", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    organisationDetails: {
                                      organisationName: "Test Corp"
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect((caseItem as any).applicant).toBe("Test Corp");
  });

  it("should handle party with empty details", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: {}
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
    expect((caseItem as any).applicant).toBe("");
  });

  it("should handle multiple reporting restrictions", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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

  it("should handle empty reporting restrictions", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                reportingRestrictionDetail: []
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
    expect((caseItem as any).formattedReportingRestriction).toBe("");
  });

  it("should handle party with unknown role", async () => {
    const inputData = {
      document: {
        publicationDate: "2025-11-12T09:00:00.000Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["Address"],
          postCode: "AB1 2CD"
        }
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
                                party: [
                                  {
                                    partyRole: "UNKNOWN_ROLE",
                                    individualDetails: {
                                      individualForenames: "John",
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

    const result = await renderCauseListData(inputData, {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    // Unknown roles should not populate any party fields
    expect((caseItem as any).applicant).toBe("");
    expect((caseItem as any).respondent).toBe("");
  });
});
