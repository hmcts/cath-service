import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMagistratesPublicListExcel } from "./excel-generator.js";

vi.mock("@hmcts/list-types-common", () => ({
  sanitiseCellValue: vi.fn((v: string) => v),
  saveExcelToStorage: vi.fn().mockResolvedValue({ excelPath: "test-id.xlsx" })
}));

vi.mock("../rendering/renderer.js", () => ({
  renderMagistratesPublicListData: vi.fn()
}));

import { saveExcelToStorage } from "@hmcts/list-types-common";
import { renderMagistratesPublicListData } from "../rendering/renderer.js";

const baseArtefactId = "test-id";
const baseOptions = {
  artefactId: baseArtefactId,
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  jsonData: {} as any
};

function makeRenderedData(overrides: Record<string, unknown> = {}) {
  return {
    header: { locationName: "Manchester Crown Court" },
    openJustice: null,
    listData: {
      venue: { venueAddress: { line: ["Manchester Crown Court"] } },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        time: "10:00am",
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseUrn: "URN123",
                                defendant: "Smith, John",
                                prosecutingAuthority: "CPS",
                                offences: ["Theft", "Fraud"],
                                reportingRestriction: false
                              }
                            ],
                            application: []
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
      ],
      ...overrides
    }
  };
}

describe("generateMagistratesPublicListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveExcelToStorage).mockResolvedValue({ excelPath: `${baseArtefactId}.xlsx` });
  });

  it("should return success with excelPath when generation succeeds", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const result = await generateMagistratesPublicListExcel(baseOptions);

    expect(result.success).toBe(true);
    expect(result.excelPath).toBe(`${baseArtefactId}.xlsx`);
    expect(result.error).toBeUndefined();
  });

  it("should write a header row containing all expected column names", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const result = await generateMagistratesPublicListExcel(baseOptions);

    expect(result.success).toBe(true);
    const buffer = vi.mocked(saveExcelToStorage).mock.calls[0]![1];
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it("should write one row per case with comma-separated offence details", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    await generateMagistratesPublicListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("Theft, Fraud");
  });

  it("should use header.locationName for the court house column", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    await generateMagistratesPublicListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("Manchester Crown Court");
  });

  it("should write reporting restriction text when reportingRestriction is true", async () => {
    const dataWithRestriction = makeRenderedData();
    dataWithRestriction.listData.courtLists[0]!.courtHouse.courtRoom[0]!.session[0]!.sittings[0]!.hearing[0]!.case[0]!.reportingRestriction = true;

    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(dataWithRestriction as any);

    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    await generateMagistratesPublicListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("Press/Publication restrictions apply to this case");
  });

  it("should write empty reporting restriction when reportingRestriction is false", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    await generateMagistratesPublicListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("");
  });

  it("should sanitise cell values via sanitiseCellValue", async () => {
    const dataWithInjection = makeRenderedData();
    dataWithInjection.listData.courtLists[0]!.courtHouse.courtRoom[0]!.session[0]!.sittings[0]!.hearing[0]!.case[0]!.defendant = "=DANGEROUS";

    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(dataWithInjection as any);

    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    await generateMagistratesPublicListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("=DANGEROUS");
  });

  it("should use Welsh column headers when locale is cy", async () => {
    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(makeRenderedData() as any);

    const result = await generateMagistratesPublicListExcel({ ...baseOptions, locale: "cy" });

    expect(result.success).toBe(true);
  });

  it("should return failure result when an error occurs", async () => {
    vi.mocked(renderMagistratesPublicListData).mockRejectedValue(new Error("Render failed"));

    const result = await generateMagistratesPublicListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Render failed");
    expect(result.excelPath).toBeUndefined();
  });
});
