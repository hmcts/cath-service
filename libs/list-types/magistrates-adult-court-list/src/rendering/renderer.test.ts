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
  document: {
    publicationDate: "2020-09-13T23:30:00Z"
  },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS", "Main Road"],
      postCode: "PR1 2LL"
    }
  },
  courtLists: [
    {
      courtHouse: {
        courtRoom: [
          {
            courtRoomName: "CourtRoom 1",
            session: [
              {
                judiciary: [{ johKnownAs: "Judge Smith" }, { johKnownAs: "Judge Jones" }],
                sittings: [
                  {
                    sittingStart: "2022-07-27T09:40:00Z",
                    hearing: [
                      {
                        hearingType: "Directions",
                        case: [
                          {
                            caseUrn: "12341234",
                            party: [
                              {
                                partyRole: "PROSECUTING_AUTHORITY",
                                organisationDetails: { organisationName: "Crown Prosecution Service" }
                              },
                              {
                                partyRole: "DEFENDANT",
                                individualDetails: { individualForenames: "John", individualSurname: "Smith" },
                                offence: [{ offenceTitle: "Drink driving" }]
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

  describe("header", () => {
    it("should return empty locationName when getLocationById returns nothing", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.locationName).toBe("");
    });

    it("should use English location name from getLocationById", async () => {
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Oxford Crown Court", welshName: null });
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.locationName).toBe("Oxford Crown Court");
    });

    it("should use Welsh location name when locale is cy and welshName is available", async () => {
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Oxford Crown Court", welshName: "Llys y Goron Rhydychen" });
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(result.header.locationName).toBe("Llys y Goron Rhydychen");
    });

    it("should format publishedDate from document.publicationDate ISO string", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedDate).toContain("2020");
      expect(result.header.publishedDate).toContain("September");
    });

    it("should format publishedTime from document.publicationDate ISO string", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedTime).toBe("23:30");
    });

    it("should return empty publishedDate and publishedTime when publicationDate is absent", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.header.publishedDate).toBe("");
      expect(result.header.publishedTime).toBe("");
    });

    it("should extract venue address lines", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.venueAddress).toEqual(["THE LAW COURTS", "Main Road", "PR1 2LL"]);
    });

    it("should return empty venueAddress when venue is absent", async () => {
      const input = { ...baseInput, venue: undefined };
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.header.venueAddress).toEqual([]);
    });

    it("should return null for openJustice", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.openJustice).toBeNull();
    });
  });

  describe("courtLists transformation", () => {
    it("should return empty courtLists when courtLists is absent", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.listData.courtLists).toHaveLength(0);
    });

    it("should preserve courtList structure from input", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.listData.courtLists).toHaveLength(1);
      expect(result.listData.courtLists[0].courtHouse.courtRoom).toHaveLength(1);
    });

    it("should set courtRoomName from input", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const courtRoom = result.listData.courtLists[0].courtHouse.courtRoom[0];
      expect(courtRoom.courtRoomName).toBe("CourtRoom 1");
    });

    it("should format judiciaries from judiciary array", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
      expect(session.formattedJudiciaries).toBe("Judge Smith, Judge Jones");
    });

    it("should return empty formattedJudiciaries when session has no judiciary", async () => {
      const input = buildInputWithSession({ sittings: [] });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
      expect(session.formattedJudiciaries).toBe("");
    });

    it("should return empty sittings when session has no sittings", async () => {
      const input = buildInputWithSession({ sittings: [] });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
      expect(session.sittings).toHaveLength(0);
    });
  });

  describe("case transformation", () => {
    it("should map caseUrn to caseNumber", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).caseNumber).toBe("12341234");
    });

    it("should build defendantName from DEFENDANT party individualDetails", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).defendantName).toBe("John Smith");
    });

    it("should extract informant from PROSECUTING_AUTHORITY organisationName", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).informant).toBe("Crown Prosecution Service");
    });

    it("should fall back to individual name for PROSECUTING_AUTHORITY when no org", async () => {
      const input = buildInputWithCase({
        caseUrn: "12345678",
        party: [
          { partyRole: "PROSECUTING_AUTHORITY", individualDetails: { individualForenames: "Test", individualSurname: "Prosecutor" } },
          { partyRole: "DEFENDANT", individualDetails: { individualForenames: "Jane", individualSurname: "Doe" } }
        ]
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractFirstCase(result).informant).toBe("Test Prosecutor");
    });

    it("should extract offenceTitle from DEFENDANT party offences", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).offenceTitle).toBe("Drink driving");
    });

    it("should join multiple offence titles with comma", async () => {
      const input = buildInputWithCase({
        caseUrn: "12345678",
        party: [
          {
            partyRole: "DEFENDANT",
            individualDetails: { individualForenames: "Jane", individualSurname: "Doe" },
            offence: [{ offenceTitle: "Offence 1" }, { offenceTitle: "Offence 2" }]
          }
        ]
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractFirstCase(result).offenceTitle).toBe("Offence 1, Offence 2");
    });

    it("should format blockStart from sittingStart ISO datetime", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).blockStart).toBe("9:40am");
    });

    it("should return empty string for offenceCode and offenceSummary", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).offenceCode).toBe("");
      expect(extractFirstCase(result).offenceSummary).toBe("");
    });

    it("should return empty strings for dateOfBirth, age, address when not in data", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(extractFirstCase(result).dateOfBirth).toBe("");
      expect(extractFirstCase(result).age).toBe("");
      expect(extractFirstCase(result).address).toBe("");
    });

    it("should return empty defendantName when no DEFENDANT party", async () => {
      const input = buildInputWithCase({
        caseUrn: "12345678",
        party: [{ partyRole: "PROSECUTING_AUTHORITY", organisationDetails: { organisationName: "CPS" } }]
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractFirstCase(result).defendantName).toBe("");
    });

    it("should return empty cases array when hearing has no cases", async () => {
      const input = buildInputWithSession({
        sittings: [{ sittingStart: "2022-07-27T09:40:00Z", hearing: [{ hearingType: "Directions", case: [] }] }]
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractCases(result)).toHaveLength(0);
    });
  });
});

function buildInputWithSession(session: object) {
  return {
    document: { publicationDate: "2020-09-13T23:30:00Z" },
    courtLists: [
      {
        courtHouse: {
          courtRoom: [{ courtRoomName: "Room 1", session: [session] }]
        }
      }
    ]
  };
}

function buildInputWithCase(caseData: object) {
  return buildInputWithSession({
    sittings: [
      {
        sittingStart: "2022-07-27T09:40:00Z",
        hearing: [{ hearingType: "Directions", case: [caseData] }]
      }
    ]
  });
}

function extractFirstCase(result: { listData: any }): any {
  return extractCases(result)[0];
}

function extractCases(result: { listData: any }): any[] {
  return result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
}
