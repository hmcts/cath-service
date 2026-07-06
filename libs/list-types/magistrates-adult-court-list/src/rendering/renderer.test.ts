import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesAdultCourtList } from "./renderer.js";

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

describe("renderMagistratesAdultCourtList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should build header with empty locationName when getLocationById returns nothing", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.header.locationName).toBe("");
  });

  it("should use location name from getLocationById when available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Preston Crown Court", welshName: null });
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.header.locationName).toBe("Preston Crown Court");
  });

  it("should use Welsh location name when locale is cy and welshName is available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Preston Crown Court", welshName: "Llys y Goron Preston" });
    const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
    expect(result.header.locationName).toBe("Llys y Goron Preston");
  });

  it("should format publishedDate from publicationDate ISO string", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.header.publishedDate).toMatch(/September|Medi/);
  });

  it("should format publishedTime as am/pm from publicationDate", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.header.publishedTime).toMatch(/(am|pm)$/i);
  });

  it("should format venueAddress as array of non-empty strings", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.header.venueAddress).toContain("THE LAW COURTS");
    expect(result.header.venueAddress).toContain("PR1 2LL");
  });

  it("should return empty venueAddress when venue is absent", async () => {
    const input = { ...baseInput, venue: undefined };
    const result = await renderMagistratesAdultCourtList(input as any, baseOptions);
    expect(result.header.venueAddress).toEqual([]);
  });

  it("should return empty courtLists when no court lists", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.listData.courtLists).toHaveLength(0);
  });

  it("should return null for openJustice", async () => {
    const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
    expect(result.openJustice).toBeNull();
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
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0] as any;
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
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
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
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
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
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0] as any;
    expect(session.formattedJudiciaries).toBe("");
  });

  it("should preserve all 10 case fields in listData", async () => {
    const input = buildInputWithCase({
      blockStart: "2020-09-13T09:00:00Z",
      defendantName: "Smith, John",
      dateOfBirth: "1990-01-01",
      address: "1 Example Street",
      age: "30",
      informant: "Crown Prosecution Service",
      caseNumber: "AB12345678",
      offenceCode: "RT88191",
      offenceTitle: "Drink driving",
      offenceSummary: "On 01/01/2020 drove a motor vehicle"
    });
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
    const caseItem = extractFirstCase(result);
    expect(caseItem.blockStart).toBe("2020-09-13T09:00:00Z");
    expect(caseItem.defendantName).toBe("Smith, John");
    expect(caseItem.dateOfBirth).toBe("1990-01-01");
    expect(caseItem.address).toBe("1 Example Street");
    expect(caseItem.age).toBe("30");
    expect(caseItem.informant).toBe("Crown Prosecution Service");
    expect(caseItem.caseNumber).toBe("AB12345678");
    expect(caseItem.offenceCode).toBe("RT88191");
    expect(caseItem.offenceTitle).toBe("Drink driving");
    expect(caseItem.offenceSummary).toBe("On 01/01/2020 drove a motor vehicle");
  });

  it("should filter empty lines from venueAddress", async () => {
    const input = {
      ...baseInput,
      venue: { venueAddress: { line: ["Court Road", "", ""], postCode: "AB1 2CD" } }
    };
    const result = await renderMagistratesAdultCourtList(input, baseOptions);
    expect(result.header.venueAddress).not.toContain("");
    expect(result.header.venueAddress).toContain("Court Road");
    expect(result.header.venueAddress).toContain("AB1 2CD");
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
                      hearing: [{ hearingType: "Trial", case: [caseData] }]
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
