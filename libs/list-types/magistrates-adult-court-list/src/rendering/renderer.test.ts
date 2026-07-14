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
    info: { start_time: "23:30:00" },
    data: {
      job: {
        printdate: "13/09/2020",
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
                          caseno: "AB12345678",
                          def_name: "Smith, John",
                          def_dob: "01/01/1990",
                          def_age: 35,
                          def_addr: { line1: "1 Example Street", line5: "London", pcode: "SW1A 1AA" },
                          inf: "Crown Prosecution Service",
                          offences: {
                            offence: [
                              {
                                code: "RT88191",
                                title: "Drink driving",
                                sum: "On 01/01/2020 drove a motor vehicle on a road after consuming so much alcohol that the proportion of it in your breath, namely 51 micrograms of alcohol in 100 millilitres of breath, exceeded the prescribed limit.",
                                cy_title: "Gyrru dan ddylanwad alcohol",
                                cy_sum: "Ar 01/01/2020 gyrrodd gerbyd modur ar ffordd ar ôl yfed cymaint o alcohol..."
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
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Oxford Crown Court", welshName: null });
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.locationName).toBe("Oxford Crown Court");
    });

    it("should use Welsh location name when locale is cy and welshName is available", async () => {
      (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Oxford Crown Court", welshName: "Llys y Goron Rhydychen" });
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(result.header.locationName).toBe("Llys y Goron Rhydychen");
    });

    it("should format publishedDate from document.data.job.printdate", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedDate).toContain("2020");
      expect(result.header.publishedDate).toContain("September");
    });

    it("should format publishedDate in Welsh when locale is cy", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(result.header.publishedDate).toContain("2020");
      expect(result.header.publishedDate).toContain("Medi");
    });

    it("should format publishedTime from document.info.start_time", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.publishedTime).toBe("11:30pm");
    });

    it("should return empty publishedDate and publishedTime when absent", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.header.publishedDate).toBe("");
      expect(result.header.publishedTime).toBe("");
    });

    it("should always return empty venueAddress", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.header.venueAddress).toEqual([]);
    });

    it("should return null for openJustice", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.openJustice).toBeNull();
    });
  });

  describe("sessions transformation", () => {
    it("should return empty sessions when document has no sessions", async () => {
      const result = await renderMagistratesAdultCourtList({ document: {} }, baseOptions);
      expect(result.listData.sessions).toHaveLength(0);
    });

    it("should map session fields from proprietary format", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      const session = result.listData.sessions[0];
      expect(session.court).toBe("North Shields Magistrates' Court");
      expect(session.lja).toBe("North Northumbria Magistrates' Court");
      expect(session.room).toBe(1);
    });

    it("should format sessionStart from sstart", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, baseOptions);
      expect(result.listData.sessions[0].sessionStart).toBe("9am");
    });

    it("should format sessionStart without :00 when minutes are zero", async () => {
      const input = buildInputWithSession({ court: "Test Court", lja: "Test LJA", room: 1, sstart: "14:00", blocks: { block: [] } });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.listData.sessions[0].sessionStart).toBe("2pm");
    });

    it("should format sessionStart with minutes when non-zero", async () => {
      const input = buildInputWithSession({ court: "Test Court", lja: "Test LJA", room: 1, sstart: "09:05", blocks: { block: [] } });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.listData.sessions[0].sessionStart).toBe("9:05am");
    });

    it("should return empty sessionStart when sstart is absent", async () => {
      const input = buildInputWithSession({ court: "Test Court", lja: "Test LJA", room: 1, blocks: { block: [] } });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.listData.sessions[0].sessionStart).toBe("");
    });

    it("should return empty cases when session has no blocks", async () => {
      const input = buildInputWithSession({ court: "Test Court", lja: "Test LJA", room: 1, blocks: { block: [] } });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(result.listData.sessions[0].cases).toHaveLength(0);
    });
  });

  describe("case transformation", () => {
    it("should map caseno to caseNumber", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).caseNumber).toBe("AB12345678");
    });

    it("should map def_name to defendantName", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).defendantName).toBe("Smith, John");
    });

    it("should map def_dob to dateOfBirth", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).dateOfBirth).toBe("01/01/1990");
    });

    it("should map def_age to age as string", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).age).toBe("35");
    });

    it("should format address from def_addr", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).address).toBe("1 Example Street, London, SW1A 1AA");
    });

    it("should map inf to informant", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).informant).toBe("Crown Prosecution Service");
    });

    it("should map offence.code to offenceCode", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).offenceCode).toBe("RT88191");
    });

    it("should map offence.title to offenceTitle in English", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).offenceTitle).toBe("Drink driving");
    });

    it("should use cy_title for offenceTitle in Welsh locale", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(extractFirstCase(result).offenceTitle).toBe("Gyrru dan ddylanwad alcohol");
    });

    it("should use cy_sum for offenceSummary in Welsh locale", async () => {
      const result = await renderMagistratesAdultCourtList(baseInput, { ...baseOptions, locale: "cy" });
      expect(extractFirstCase(result).offenceSummary).toContain("01/01/2020");
    });

    it("should format blockStart from bstart", async () => {
      expect(extractFirstCase(await renderMagistratesAdultCourtList(baseInput, baseOptions)).blockStart).toBe("9am");
    });

    it("should join multiple offences with comma", async () => {
      const input = buildInputWithCase({
        caseno: "XY999",
        offences: {
          offence: [
            { code: "TH68003", title: "Theft 1", sum: "Summary 1" },
            { code: "TH68004", title: "Theft 2", sum: "Summary 2" }
          ]
        }
      });
      const firstCase = extractFirstCase(await renderMagistratesAdultCourtList(input, baseOptions));
      expect(firstCase.offenceCode).toBe("TH68003, TH68004");
      expect(firstCase.offenceTitle).toBe("Theft 1, Theft 2");
      expect(firstCase.offenceSummary).toBe("Summary 1, Summary 2");
    });

    it("should return empty strings for absent case fields", async () => {
      const input = buildInputWithCase({});
      const firstCase = extractFirstCase(await renderMagistratesAdultCourtList(input, baseOptions));
      expect(firstCase.caseNumber).toBe("");
      expect(firstCase.defendantName).toBe("");
      expect(firstCase.dateOfBirth).toBe("");
      expect(firstCase.age).toBe("");
      expect(firstCase.address).toBe("");
      expect(firstCase.informant).toBe("");
      expect(firstCase.offenceCode).toBe("");
      expect(firstCase.offenceTitle).toBe("");
      expect(firstCase.offenceSummary).toBe("");
    });

    it("should return empty cases array when block has no cases", async () => {
      const input = buildInputWithSession({
        court: "Test Court",
        lja: "Test LJA",
        room: 1,
        blocks: { block: [{ bstart: "09:00", cases: { case: [] } }] }
      });
      const result = await renderMagistratesAdultCourtList(input, baseOptions);
      expect(extractCases(result)).toHaveLength(0);
    });
  });
});

function buildInputWithSession(sessionData: object) {
  return {
    document: {
      data: { job: { sessions: { session: [sessionData] } } }
    }
  };
}

function buildInputWithCase(caseData: object) {
  return buildInputWithSession({
    court: "Test Court",
    lja: "Test LJA",
    room: 1,
    sstart: "09:00",
    blocks: { block: [{ bstart: "09:00", cases: { case: [caseData] } }] }
  });
}

function extractFirstCase(result: { listData: any }): any {
  return extractCases(result)[0];
}

function extractCases(result: { listData: any }): any[] {
  return result.listData.sessions[0].cases;
}
