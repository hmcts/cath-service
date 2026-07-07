import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesPublicListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  formatDisplayDate: vi.fn((_date: Date, locale: string) => (locale === "cy" ? "13 Medi 2020" : "13 September 2020"))
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  document: { publicationDate: "2020-09-13T23:30:00Z" },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS", "Main Road"],
      postCode: "PR1 2LL"
    }
  },
  courtLists: []
};

const baseOptions = {
  locationId: "10",
  contentDate: new Date("2020-09-13"),
  locale: "en"
};

describe("renderMagistratesPublicListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should build header with location name from venue when getLocationById returns nothing", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.header.locationName).toBe("");
  });

  it("should use location name from getLocationById when available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Preston Crown Court", welshName: null });
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.header.locationName).toBe("Preston Crown Court");
  });

  it("should use Welsh location name when locale is cy and welshName is available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Preston Crown Court", welshName: "Llys y Goron Preston" });
    const result = await renderMagistratesPublicListData(baseInput, { ...baseOptions, locale: "cy" });
    expect(result.header.locationName).toBe("Llys y Goron Preston");
  });

  it("should format publishedDate from publicationDate ISO string", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.header.publishedDate).toMatch(/September|Medi/);
  });

  it("should format publishedTime as am/pm from publicationDate", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.header.publishedTime).toMatch(/(am|pm)$/i);
  });

  it("should format venueAddress as array of non-empty strings", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.header.venueAddress).toContain("THE LAW COURTS");
    expect(result.header.venueAddress).toContain("PR1 2LL");
  });

  it("should return empty venueAddress when venue is absent", async () => {
    const input = { ...baseInput, venue: undefined };
    const result = await renderMagistratesPublicListData(input as any, baseOptions);
    expect(result.header.venueAddress).toEqual([]);
  });

  it("should return empty courtLists listData when no court lists", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.listData.courtLists).toHaveLength(0);
  });

  it("should set sitting.time from sittingStart ISO string", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    sittings: [{ sittingStart: "2020-09-13T09:40:00Z", hearing: [] }]
                  }
                ]
              }
            ]
          }
        }
      ]
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0] as any;
    expect(sitting.time).toMatch(/(am|pm)$/i);
  });

  it("should omit :00 minutes for on-the-hour sitting times", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    sittings: [{ sittingStart: "2020-09-13T10:00:00Z", hearing: [] }]
                  }
                ]
              }
            ]
          }
        }
      ]
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0] as any;
    expect(sitting.time).not.toContain(":00");
    expect(sitting.time).toMatch(/(am|pm)$/i);
  });

  it("should set sitting.time to empty string when sittingStart is absent", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [{ sittings: [{ hearing: [] } as any] }]
              }
            ]
          }
        }
      ]
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0] as any;
    expect(sitting.time).toBe("");
  });

  it("should set session.formattedJudiciaries from judiciary array", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "Judge Smith" }, { johKnownAs: "District Judge Jones" }],
                    sittings: []
                  }
                ]
              }
            ]
          }
        }
      ]
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0] as any;
    expect(session.formattedJudiciaries).toBe("Judge Smith, District Judge Jones");
  });

  it("should set formattedJudiciaries to empty string when judiciary is absent", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtRoom: [{ courtRoomName: "Room 1", session: [{ sittings: [] }] }]
          }
        }
      ]
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0] as any;
    expect(session.formattedJudiciaries).toBe("");
  });

  it("should set case.defendant from DEFENDANT party individual details", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN001",
      party: [
        {
          partyRole: "DEFENDANT",
          individualDetails: { individualForenames: "John", individualSurname: "Smith" }
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const caseItem = extractFirstCase(result);
    expect(caseItem.defendant).toBe("Smith, John");
  });

  it("should set case.defendant from DEFENDANT party organisation details", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN002",
      party: [{ partyRole: "DEFENDANT", organisationDetails: { organisationName: "ACME Ltd" } }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).defendant).toBe("ACME Ltd");
  });

  it("should set case.defendant to empty string when no DEFENDANT party", async () => {
    const input = buildInputWithCase({ caseUrn: "URN003", party: [] });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).defendant).toBe("");
  });

  it("should set case.prosecutingAuthority from PROSECUTING_AUTHORITY party", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN004",
      party: [{ partyRole: "PROSECUTING_AUTHORITY", organisationDetails: { organisationName: "CPS" } }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).prosecutingAuthority).toBe("CPS");
  });

  it("should set case.prosecutingAuthority from individual prosecuting authority", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN005",
      party: [
        {
          partyRole: "PROSECUTING_AUTHORITY",
          individualDetails: { individualForenames: "Jane", individualSurname: "Doe" }
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).prosecutingAuthority).toBe("Doe, Jane");
  });

  it("should set case.prosecutingAuthority to empty string when no PROSECUTING_AUTHORITY party", async () => {
    const input = buildInputWithCase({ caseUrn: "URN006", party: [] });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).prosecutingAuthority).toBe("");
  });

  it("should set case.offences from DEFENDANT party offence titles", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN007",
      party: [
        {
          partyRole: "DEFENDANT",
          individualDetails: { individualForenames: "Alice", individualSurname: "Brown" },
          offence: [{ offenceTitle: "Drink driving" }, { offenceTitle: "Speeding" }]
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).offences).toEqual(["Drink driving", "Speeding"]);
  });

  it("should exclude empty offence titles", async () => {
    const input = buildInputWithCase({
      caseUrn: "URN008",
      party: [
        {
          partyRole: "DEFENDANT",
          individualDetails: { individualForenames: "Bob", individualSurname: "Jones" },
          offence: [{ offenceTitle: "" }, { offenceTitle: "Theft" }]
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).offences).toEqual(["Theft"]);
  });

  it("should set case.offences to empty array when no DEFENDANT party", async () => {
    const input = buildInputWithCase({ caseUrn: "URN009", party: [] });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).offences).toEqual([]);
  });

  it("should set application.defendant from subject=true party", async () => {
    const input = buildInputWithApplication({
      applicationReference: "APP001",
      party: [
        {
          subject: true,
          individualDetails: { individualForenames: "Tom", individualSurname: "Hardy" }
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    const application = extractFirstApplication(result);
    expect(application.defendant).toBe("Hardy, Tom");
  });

  it("should set application.prosecutingAuthority from PROSECUTING_AUTHORITY party", async () => {
    const input = buildInputWithApplication({
      applicationReference: "APP002",
      party: [
        { partyRole: "PROSECUTING_AUTHORITY", organisationDetails: { organisationName: "SFO" } },
        { subject: true, individualDetails: { individualForenames: "Test", individualSurname: "Person" } }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstApplication(result).prosecutingAuthority).toBe("SFO");
  });

  it("should set application.offences from subject party offence titles", async () => {
    const input = buildInputWithApplication({
      applicationReference: "APP003",
      party: [
        {
          subject: true,
          individualDetails: { individualForenames: "Sue", individualSurname: "White" },
          offence: [{ offenceTitle: "Fraud" }]
        }
      ]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstApplication(result).offences).toEqual(["Fraud"]);
  });

  it("should return null for openJustice", async () => {
    const result = await renderMagistratesPublicListData(baseInput, baseOptions);
    expect(result.openJustice).toBeNull();
  });

  it("should filter empty lines from venueAddress", async () => {
    const input = {
      ...baseInput,
      venue: { venueAddress: { line: ["Court Road", "", ""], postCode: "AB1 2CD" } }
    };
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(result.header.venueAddress).not.toContain("");
    expect(result.header.venueAddress).toContain("Court Road");
    expect(result.header.venueAddress).toContain("AB1 2CD");
  });

  it("should set defendant from surname only when forenames absent", async () => {
    const input = buildInputWithCase({
      party: [{ partyRole: "DEFENDANT", individualDetails: { individualSurname: "OnlyLastName" } }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).defendant).toBe("OnlyLastName");
  });

  it("should set defendant from forenames only when surname absent", async () => {
    const input = buildInputWithCase({
      party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "OnlyFirstName" } }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).defendant).toBe("OnlyFirstName");
  });

  it("should set defendant to empty string when party has no name details", async () => {
    const input = buildInputWithCase({
      party: [{ partyRole: "DEFENDANT" }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).defendant).toBe("");
  });

  it("should set prosecutingAuthority from surname only when forenames absent", async () => {
    const input = buildInputWithCase({
      party: [{ partyRole: "PROSECUTING_AUTHORITY", individualDetails: { individualSurname: "OnlySurname" } }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).prosecutingAuthority).toBe("OnlySurname");
  });

  it("should set prosecutingAuthority to empty string when authority has no name details", async () => {
    const input = buildInputWithCase({
      party: [{ partyRole: "PROSECUTING_AUTHORITY" }]
    });
    const result = await renderMagistratesPublicListData(input, baseOptions);
    expect(extractFirstCase(result).prosecutingAuthority).toBe("");
  });
});

function buildInputWithCase(caseData: object) {
  return {
    ...baseInput,
    courtLists: [
      {
        courtHouse: {
          courtRoom: [
            {
              courtRoomName: "Room 1",
              session: [
                {
                  sittings: [
                    {
                      sittingStart: "2020-09-13T09:00:00Z",
                      hearing: [{ hearingType: "Trial", case: [caseData], application: [] }]
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
}

function buildInputWithApplication(applicationData: object) {
  return {
    ...baseInput,
    courtLists: [
      {
        courtHouse: {
          courtRoom: [
            {
              courtRoomName: "Room 1",
              session: [
                {
                  sittings: [
                    {
                      sittingStart: "2020-09-13T09:00:00Z",
                      hearing: [{ hearingType: "Application", case: [], application: [applicationData] }]
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
}

function extractFirstCase(result: { listData: any }): any {
  return result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
}

function extractFirstApplication(result: { listData: any }): any {
  return result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].application[0];
}
