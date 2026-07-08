import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MagistratesStandardList } from "../models/types.js";
import { renderMagistratesStandardListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const MINIMAL_JSON: MagistratesStandardList = {
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
  courtLists: []
};

const FULL_JSON: MagistratesStandardList = {
  document: {
    publicationDate: "2025-01-13T09:30:00.000Z"
  },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS"],
      town: "Manchester",
      postCode: "M3 3FL"
    }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Manchester Magistrates Court",
        lja: "Greater Manchester",
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                judiciary: [{ johKnownAs: "District Judge Smith", isPresiding: true }],
                sittings: [
                  {
                    sittingStart: "2025-01-13T10:00:00.000Z",
                    hearing: [
                      {
                        hearingType: "First hearing",
                        panel: "ADULT",
                        channel: ["VIDEO HEARING"],
                        case: [
                          {
                            caseUrn: "URN12345",
                            reportingRestriction: false,
                            party: [
                              {
                                partyRole: "DEFENDANT",
                                individualDetails: {
                                  individualForenames: "John",
                                  individualSurname: "Smith",
                                  dateOfBirth: "1990-05-15",
                                  age: 34,
                                  address: {
                                    line: ["12 High Street"],
                                    town: "Salford",
                                    postCode: "M5 1AB"
                                  },
                                  asn: "ASN123456",
                                  pncId: "PNC789"
                                },
                                offence: [
                                  {
                                    offenceCode: "DD01",
                                    offenceTitle: "Drink driving",
                                    offenceWording: "Driving whilst over the legal alcohol limit",
                                    offenceMaxPen: "6 months imprisonment",
                                    plea: "GUILTY",
                                    pleaDate: "2025-01-10T00:00:00.000Z",
                                    offenceLegislation: "Road Traffic Act 1988"
                                  }
                                ]
                              },
                              {
                                partyRole: "PROSECUTING_AUTHORITY",
                                organisationDetails: {
                                  organisationName: "Crown Prosecution Service"
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

describe("renderMagistratesStandardListData", () => {
  beforeEach(() => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Manchester Magistrates Court", welshName: "Llys Ynadon Manceinion" });
  });

  it("should return correct header structure with minimal JSON", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13")
    });

    expect(result.header).toHaveProperty("locationName");
    expect(result.header).toHaveProperty("contentDate");
    expect(result.header).toHaveProperty("publishedDate");
    expect(result.header).toHaveProperty("publishedTime");
    expect(result.header).toHaveProperty("venueAddress");
  });

  it("should resolve location name from locationId", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13")
    });

    expect(result.header.locationName).toBe("Manchester Magistrates Court");
  });

  it("should use Welsh location name for cy locale", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "cy",
      locationId: "123",
      contentDate: new Date("2025-01-13")
    });

    expect(result.header.locationName).toBe("Llys Ynadon Manceinion");
  });

  it("should fall back to empty string when location not found", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "999",
      contentDate: new Date("2025-01-13")
    });

    expect(result.header.locationName).toBe("");
  });

  it("should format header dates and times correctly", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.header.publishedDate).toContain("2025");
    expect(result.header.publishedTime).toMatch(/^\d{1,2}:\d{2}(am|pm)$/);
    expect(result.header.venueAddress).toContain("Manchester");
  });

  it("should return empty listData for empty courtLists", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13")
    });

    expect(result.listData).toHaveLength(0);
  });

  it("should correctly render a court room with one hearing", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData).toHaveLength(1);
    const room = result.listData[0];
    expect(room.courtHouseName).toBe("Manchester Magistrates Court");
    expect(room.lja).toBe("Greater Manchester");
    expect(room.courtRoomName).toBe("Court 1: District Judge Smith");
  });

  it("should include judiciary names in the court room name", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].courtRoomName).toBe("Court 1: District Judge Smith");
  });

  it("should format individual party name as Surname, Forename", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    const hearing = result.listData[0].sittings[0].hearings[0];
    expect(hearing.partyInfo.name).toBe("Smith, John");
  });

  it("should include gender in individual name when present", async () => {
    const jsonWithGender: MagistratesStandardList = {
      ...FULL_JSON,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "TEST001",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "Jane",
                                      individualSurname: "Doe",
                                      gender: "female"
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

    const result = await renderMagistratesStandardListData(jsonWithGender, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].sittings[0].hearings[0].partyInfo.name).toBe("Doe, Jane (female)");
  });

  it("should mark in-custody defendants with an asterisk", async () => {
    const jsonWithCustody: MagistratesStandardList = {
      ...FULL_JSON,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "TEST002",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "Bob",
                                      individualSurname: "Jones",
                                      inCustody: true
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

    const result = await renderMagistratesStandardListData(jsonWithCustody, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].sittings[0].hearings[0].partyInfo.name).toBe("Jones, Bob*");
  });

  it("should process offences correctly", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    const offences = result.listData[0].sittings[0].hearings[0].offences;
    expect(offences).toHaveLength(1);
    expect(offences[0].offenceCode).toBe("DD01");
    expect(offences[0].offenceTitle).toBe("Drink driving");
    expect(offences[0].offenceLegislation).toBe("Road Traffic Act 1988");
    expect(offences[0].plea).toBe("GUILTY");
    expect(offences[0].pleaDate).toBe("10/01/2025");
    expect(offences[0].offenceMaxPenalty).toBe("6 months imprisonment");
  });

  it("should include reporting restriction details on case", async () => {
    const jsonWithRestriction: MagistratesStandardList = {
      ...FULL_JSON,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "TEST003",
                                reportingRestriction: true,
                                reportingRestrictionDetails: ["Restriction A", "Restriction B"],
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "Test",
                                      individualSurname: "Person"
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

    const result = await renderMagistratesStandardListData(jsonWithRestriction, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    const hearing = result.listData[0].sittings[0].hearings[0];
    expect(hearing.reportingRestriction).toBe(true);
    expect(hearing.reportingRestrictionDetails).toBe("Restriction A, Restriction B");
  });

  it("should process applications with subject party", async () => {
    const jsonWithApplication: MagistratesStandardList = {
      document: { publicationDate: "2025-01-13T09:30:00.000Z" },
      venue: {},
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            application: [
                              {
                                applicationReference: "APP001",
                                applicationType: "Restraining Order",
                                applicationParticulars: "Urgent application",
                                party: [
                                  {
                                    subject: true,
                                    organisationDetails: {
                                      organisationName: "Respondent Ltd"
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

    const result = await renderMagistratesStandardListData(jsonWithApplication, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData).toHaveLength(1);
    const hearing = result.listData[0].sittings[0].hearings[0];
    expect(hearing.partyInfo.name).toBe("Respondent Ltd");
    expect(hearing.reference).toBe("APP001");
    expect(hearing.applicationType).toBe("Restraining Order");
    expect(hearing.applicationParticulars).toBe("Urgent application");
  });

  it("should find prosecuting authority from parties", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    const hearing = result.listData[0].sittings[0].hearings[0];
    expect(hearing.prosecutingAuthority).toBe("Crown Prosecution Service");
  });

  it("should format attendance method from channels", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    const hearing = result.listData[0].sittings[0].hearings[0];
    expect(hearing.attendanceMethod).toBe("VIDEO HEARING");
  });

  it("should merge sittings when two hearings share the same sitting time", async () => {
    const jsonWithTwoHearingsSameSitting: MagistratesStandardList = {
      document: { publicationDate: "2025-01-13T09:30:00.000Z" },
      venue: {},
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "A001",
                                party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Alice", individualSurname: "One" } }]
                              }
                            ]
                          },
                          {
                            case: [
                              {
                                caseUrn: "A002",
                                party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Bob", individualSurname: "Two" } }]
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

    const result = await renderMagistratesStandardListData(jsonWithTwoHearingsSameSitting, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].sittings).toHaveLength(1);
    expect(result.listData[0].sittings[0].hearings).toHaveLength(2);
    expect(result.listData[0].sittings[0].hearings[0].partyInfo.name).toBe("One, Alice");
    expect(result.listData[0].sittings[0].hearings[1].partyInfo.name).toBe("Two, Bob");
  });

  it("should merge court rooms when same courtHouseName and courtRoomName appear in multiple sessions", async () => {
    const jsonWithTwoSessions: MagistratesStandardList = {
      document: { publicationDate: "2025-01-13T09:30:00.000Z" },
      venue: {},
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "S001",
                                party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "First", individualSurname: "Session" } }]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T14:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "S002",
                                party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Second", individualSurname: "Session" } }]
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

    const result = await renderMagistratesStandardListData(jsonWithTwoSessions, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData).toHaveLength(1);
    expect(result.listData[0].sittings).toHaveLength(2);
  });

  it("should return empty name for party with neither individual nor organisation details", async () => {
    const jsonWithEmptyParty: MagistratesStandardList = {
      document: { publicationDate: "2025-01-13T09:30:00.000Z" },
      venue: {},
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-13T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseUrn: "E001",
                                party: [{ partyRole: "DEFENDANT" }]
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

    const result = await renderMagistratesStandardListData(jsonWithEmptyParty, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].sittings[0].hearings[0].partyInfo.name).toBe("");
  });

  it("should format time without minutes when on the hour", async () => {
    const result = await renderMagistratesStandardListData(FULL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-13T00:00:00.000Z")
    });

    expect(result.listData[0].sittings[0].sittingHeading).toMatch(/^10am$/);
  });

  it("should use 2-digit day for content and published dates", async () => {
    const result = await renderMagistratesStandardListData(MINIMAL_JSON, {
      locale: "en",
      locationId: "123",
      contentDate: new Date("2025-01-03T00:00:00.000Z")
    });

    expect(result.header.contentDate).toMatch(/^03 /);
    expect(result.header.publishedDate).toMatch(/^13 /);
  });
});
