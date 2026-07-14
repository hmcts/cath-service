import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesPublicAdultCourtListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  formatDisplayDate: vi.fn((_date: Date, locale: string) => (locale === "cy" ? "13 Medi 2020" : "13 September 2020")),
  formatDdMmYyyyDate: vi.fn((date: string, locale: string) => {
    if (date === "13/09/2020") return locale === "cy" ? "13 Medi 2020" : "13 September 2020";
    if (date === "14/09/2020") return "14 September 2020";
    return date;
  }),
  formatHHMMTime: vi.fn((time: string) => {
    const map: Record<string, string> = { "09:00": "9am", "10:30": "10:30am", "08:30": "8:30am" };
    return map[time] ?? time;
  })
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  document: {
    data: {
      job: {
        printdate: "13/09/2020",
        sessions: {
          session: [
            {
              lja: "Greater Manchester",
              court: "Manchester Crown Court",
              room: 1,
              sstart: "09:00",
              blocks: {
                block: [
                  {
                    bstart: "09:00",
                    cases: {
                      case: [
                        { caseno: "1234567890", def_name: "SMITH, John" },
                        { caseno: "0987654321", def_name: "JONES, Jane" }
                      ]
                    }
                  },
                  {
                    bstart: "10:30",
                    cases: {
                      case: [{ caseno: "1122334455", def_name: "BROWN, Bob" }]
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

describe("renderMagistratesPublicAdultCourtListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should return empty location name when getLocationById returns nothing", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.header.locationName).toBe("");
  });

  it("should use English location name when locale is en", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Manchester Crown Court", welshName: "Llys y Goron Manceinion" });
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.header.locationName).toBe("Manchester Crown Court");
  });

  it("should use Welsh location name when locale is cy and welshName is available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, name: "Manchester Crown Court", welshName: "Llys y Goron Manceinion" });
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, { ...baseOptions, locale: "cy" });
    expect(result.header.locationName).toBe("Llys y Goron Manceinion");
  });

  it("should format contentDate using formatDisplayDate", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.header.contentDate).toBe("13 September 2020");
  });

  it("should use printdate from JSON for publishedDate", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.header.publishedDate).toBe("13 September 2020");
  });

  it("should fall back to contentDate for publishedDate when printdate is absent", async () => {
    const inputWithoutPrintdate = { document: { data: { job: { sessions: {} } } } };
    const result = await renderMagistratesPublicAdultCourtListData(inputWithoutPrintdate, baseOptions);
    expect(result.header.publishedDate).toBe("13 September 2020");
  });

  it("should use start_time from JSON for publishedTime", async () => {
    const inputWithStartTime = { ...baseInput, document: { ...baseInput.document, info: { start_time: "08:30:00" } } };
    const result = await renderMagistratesPublicAdultCourtListData(inputWithStartTime, baseOptions);
    expect(result.header.publishedTime).toBe("8:30am");
  });

  it("should return empty publishedTime when start_time is absent", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.header.publishedTime).toBe("");
  });

  it("should process sessions into listData", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.listData).toHaveLength(1);
    expect(result.listData[0].courtName).toBe("Manchester Crown Court");
    expect(result.listData[0].lja).toBe("Greater Manchester");
    expect(result.listData[0].courtRoom).toBe(1);
    expect(result.listData[0].sessionStartTime).toBe("9am");
  });

  it("should flatten cases from all blocks within a session", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    expect(result.listData[0].cases).toHaveLength(3);
  });

  it("should map case fields correctly", async () => {
    const result = await renderMagistratesPublicAdultCourtListData(baseInput, baseOptions);
    const firstCase = result.listData[0].cases[0];
    expect(firstCase.blockStartTime).toBe("9am");
    expect(firstCase.defendantName).toBe("SMITH, John");
    expect(firstCase.caseNumber).toBe("1234567890");
  });

  it("should return empty listData when sessions are absent", async () => {
    const emptyInput = { document: { data: { job: { printdate: "13/09/2020", sessions: {} } } } };
    const result = await renderMagistratesPublicAdultCourtListData(emptyInput, baseOptions);
    expect(result.listData).toHaveLength(0);
  });

  it("should handle sessions with no blocks gracefully", async () => {
    const noBlocksInput = {
      document: {
        data: {
          job: {
            printdate: "13/09/2020",
            sessions: {
              session: [{ lja: "Test LJA", court: "Test Court", room: 1, sstart: "09:00" }]
            }
          }
        }
      }
    };
    const result = await renderMagistratesPublicAdultCourtListData(noBlocksInput, baseOptions);
    expect(result.listData[0].cases).toHaveLength(0);
  });
});
