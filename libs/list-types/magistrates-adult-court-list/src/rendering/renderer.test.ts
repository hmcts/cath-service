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
    info: { start_time: "09:05:02" },
    data: {
      job: {
        printdate: "31/07/2025",
        sessions: {
          session: [
            {
              lja: "North Northumbria Magistrates' Court",
              court: "North Shields Magistrates' Court",
              room: 1,
              sstart: "09:00",
              blocks: {
                block: [
                  {
                    bstart: "09:00",
                    cases: {
                      case: [
                        {
                          caseno: "1000000000",
                          def_name: "Mr Test User",
                          def_dob: "06/11/1975",
                          def_age: 50,
                          def_addr: { line1: "1 High Street", line5: "London", pcode: "SW1A 1AA" },
                          inf: "POL01",
                          offences: {
                            offence: [
                              {
                                code: "TH68001",
                                title: "Offence title 1",
                                cy_title: "Welsh offence title 1",
                                sum: "Offence summary 1",
                                cy_sum: "Welsh offence summary 1"
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }
  }
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
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "North Shields Court", welshName: null });
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.locationName).toBe("North Shields Court");
    });

    it("should use Welsh location name when locale is cy and welshName is available", async () => {
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "North Shields Court", welshName: "Llys Northumbria" });
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(result.header.locationName).toBe("Llys Northumbria");
    });

    it("should format publishedDate from printdate DD/MM/YYYY", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedDate).toContain("2025");
      expect(result.header.publishedDate).toContain("July");
    });

    it("should format publishedTime from start_time hh:mm:ss", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedTime).toBe("9:05am");
    });

    it("should return empty publishedTime when start_time is absent", async () => {
      const input = { document: { data: baseInput.document.data } };
      const result = await renderMagistratesAdultCourtList(input as any, baseOptions);
      expect(result.header.publishedTime).toBe("");
    });

    it("should return empty venueAddress", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.venueAddress).toEqual([]);
    });

    it("should return null for openJustice", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.openJustice).toBeNull();
    });

    it("should return empty publishedDate when document data is absent", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.header.publishedDate).toBe("");
    });
  });

  describe("session transformation", () => {
    it("should return empty courtLists when no sessions", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.listData.courtLists).toHaveLength(0);
    });

    it("should group sessions by court into separate courtLists", async () => {
      const input = buildInputWithSessions([
        { lja: "LJA A", court: "Court A", room: 1, sstart: "09:00" },
        { lja: "LJA A", court: "Court A", room: 2, sstart: "10:00" },
        { lja: "LJA B", court: "Court B", room: 1, sstart: "09:00" }
      ]);
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.listData.courtLists).toHaveLength(2);
      expect(result.listData.courtLists[0].courtHouse.courtRoom).toHaveLength(2);
      expect(result.listData.courtLists[1].courtHouse.courtRoom).toHaveLength(1);
    });

    it("should set courtRoomName as court + room number", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const courtRoom = result.listData.courtLists[0].courtHouse.courtRoom[0];
      expect(courtRoom.courtRoomName).toBe("North Shields Magistrates' Court - Room 1");
    });

    it("should set formattedJudiciaries to empty string", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
      expect(session.formattedJudiciaries).toBe("");
    });

    it("should return empty sittings when session has no blocks", async () => {
      const input = buildInputWithSessions([{ lja: "LJA", court: "Court A", room: 1, sstart: "09:00" }]);
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
      expect(session.sittings).toHaveLength(0);
    });
  });

  describe("case transformation", () => {
    it("should map case fields correctly", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const caseItem = extractFirstCase(result);
      expect(caseItem.caseNumber).toBe("1000000000");
      expect(caseItem.defendantName).toBe("Mr Test User");
      expect(caseItem.dateOfBirth).toBe("06/11/1975");
      expect(caseItem.age).toBe("50");
      expect(caseItem.address).toBe("1 High Street, London, SW1A 1AA");
      expect(caseItem.informant).toBe("POL01");
      expect(caseItem.blockStart).toBe("09:00");
    });

    it("should map offence fields correctly", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const caseItem = extractFirstCase(result);
      expect(caseItem.offenceCode).toBe("TH68001");
      expect(caseItem.offenceTitle).toBe("Offence title 1");
      expect(caseItem.offenceSummary).toBe("Offence summary 1");
    });

    it("should use Welsh offence title and summary when locale is cy", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      const caseItem = extractFirstCase(result);
      expect(caseItem.offenceTitle).toBe("Welsh offence title 1");
      expect(caseItem.offenceSummary).toBe("Welsh offence summary 1");
    });

    it("should fall back to English title when cy_title is absent", async () => {
      const input = buildInputWithOffence({ code: "TH001", title: "English title", sum: "English summary" });
      const result = await renderMagistratesAdultCourtList(input, { ...baseOptions, locale: "cy" });
      const caseItem = extractFirstCase(result);
      expect(caseItem.offenceTitle).toBe("English title");
    });

    it("should flatten multiple offences into separate case rows", async () => {
      const input = buildInputWithOffences([
        { code: "TH001", title: "Offence 1", sum: "Summary 1" },
        { code: "TH002", title: "Offence 2", sum: "Summary 2" }
      ]);
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const cases = extractCases(result);
      expect(cases).toHaveLength(2);
      expect(cases[0].offenceCode).toBe("TH001");
      expect(cases[1].offenceCode).toBe("TH002");
      expect(cases[0].caseNumber).toBe(cases[1].caseNumber);
    });

    it("should create one row with empty offence fields when case has no offences", async () => {
      const input = buildInputWithCase({ caseno: "1000000000", def_name: "Test User" });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const cases = extractCases(result);
      expect(cases).toHaveLength(1);
      expect(cases[0].offenceCode).toBe("");
      expect(cases[0].offenceTitle).toBe("");
    });

    it("should handle missing optional case fields with empty strings", async () => {
      const input = buildInputWithCase({ caseno: "1000000000", def_name: "Test User" });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      const caseItem = extractFirstCase(result);
      expect(caseItem.dateOfBirth).toBe("");
      expect(caseItem.age).toBe("");
      expect(caseItem.address).toBe("");
      expect(caseItem.informant).toBe("");
    });

    it("should format address from def_addr object", async () => {
      const input = buildInputWithCase({
        caseno: "1000000000",
        def_name: "Test User",
        def_addr: { line1: "1 High Street", line2: "Area", pcode: "SW1A 1AA" }
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractFirstCase(result).address).toBe("1 High Street, Area, SW1A 1AA");
    });

    it("should return empty cases when block has no cases", async () => {
      const input = buildInputWithSessions([
        {
          lja: "LJA",
          court: "Court A",
          room: 1,
          sstart: "09:00",
          blocks: { block: [{ bstart: "09:00" }] }
        }
      ]);
      const result = await renderMagistratesAdultCourtList(input as any, baseOptions);
      const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
      expect(sitting.hearing[0].case).toHaveLength(0);
    });
  });
});

function buildInputWithSessions(sessions: object[]) {
  return {
    document: {
      data: {
        job: {
          printdate: "01/01/2025",
          sessions: { session: sessions }
        }
      }
    }
  };
}

function buildInputWithCase(caseData: object) {
  return buildInputWithSessions([
    {
      lja: "LJA",
      court: "Court A",
      room: 1,
      sstart: "09:00",
      blocks: { block: [{ bstart: "09:00", cases: { case: [caseData] } }] }
    }
  ]);
}

function buildInputWithOffence(offence: object) {
  return buildInputWithOffences([offence]);
}

function buildInputWithOffences(offences: object[]) {
  return buildInputWithCase({
    caseno: "1000000000",
    def_name: "Test User",
    offences: { offence: offences }
  });
}

function extractFirstCase(result: { listData: any }): any {
  return extractCases(result)[0];
}

function extractCases(result: { listData: any }): any[] {
  return result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case;
}
