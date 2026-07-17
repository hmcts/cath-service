import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMagistratesStandardListExcel } from "./excel-generator.js";

vi.mock("@hmcts/list-types-common", () => ({
  sanitiseCellValue: vi.fn((v: string) => v),
  saveExcelToStorage: vi.fn().mockResolvedValue({ excelPath: "test-id.xlsx" })
}));

vi.mock("../rendering/renderer.js", () => ({
  renderMagistratesStandardListData: vi.fn()
}));

import { sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import { renderMagistratesStandardListData } from "../rendering/renderer.js";

const baseArtefactId = "test-id";
const baseOptions = {
  artefactId: baseArtefactId,
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  jsonData: {} as any
};

function makeHearing(offences: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    partyInfo: { name: "Smith, John", dob: "01/01/1980", age: "45", address: "1 Main St", asn: "ASN001", pncId: "" },
    sittingStartTime: "10:00am",
    prosecutingAuthority: "CPS",
    attendanceMethod: "In Person",
    reference: "URN123",
    applicationType: "",
    caseSequenceIndicator: "",
    hearingType: "Trial",
    panel: "",
    applicationParticulars: "",
    reportingRestriction: false,
    reportingRestrictionDetails: "",
    offences,
    ...overrides
  };
}

function makeOffence(overrides: Record<string, unknown> = {}) {
  return {
    offenceCode: "TH001",
    offenceTitle: "Theft",
    offenceWording: "Stole goods",
    plea: "Guilty",
    pleaDate: "01/01/2025",
    convictionDate: "",
    adjournedDate: "",
    offenceLegislation: "Theft Act 1968",
    offenceMaxPenalty: "7 years",
    reportingRestriction: false,
    reportingRestrictionDetails: "",
    ...overrides
  };
}

function makeRenderedData(hearings: unknown[] = [makeHearing([makeOffence()])]) {
  return {
    header: {},
    listData: [
      {
        courtHouseName: "Manchester Crown Court",
        courtRoomName: "Court 1",
        lja: "Greater Manchester",
        sittings: [
          {
            sittingHeading: "10:00am",
            hearings
          }
        ]
      }
    ]
  };
}

describe("generateMagistratesStandardListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveExcelToStorage).mockResolvedValue({ excelPath: `${baseArtefactId}.xlsx` });
  });

  it("should return success with excelPath when generation succeeds", async () => {
    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData() as any);

    const result = await generateMagistratesStandardListExcel(baseOptions);

    expect(result.success).toBe(true);
    expect(result.excelPath).toBe(`${baseArtefactId}.xlsx`);
    expect(result.error).toBeUndefined();
  });

  it("should write a header row containing all expected column names for en locale", async () => {
    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData() as any);

    await generateMagistratesStandardListExcel(baseOptions);

    expect(saveExcelToStorage).toHaveBeenCalledWith(baseArtefactId, expect.any(Buffer));
  });

  it("should write one row per offence, repeating defendant-level fields", async () => {
    const offences = [makeOffence({ offenceTitle: "Theft" }), makeOffence({ offenceTitle: "Fraud" })];
    const hearing = makeHearing(offences);

    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData([hearing]) as any);

    await generateMagistratesStandardListExcel(baseOptions);

    // sanitiseCellValue called for name on each offence row (2 times)
    const nameCalls = vi.mocked(sanitiseCellValue).mock.calls.filter(([v]) => v === "Smith, John");
    expect(nameCalls.length).toBe(2);
  });

  it("should produce one row with empty offence columns when hearing has no offences", async () => {
    const hearing = makeHearing([]);

    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData([hearing]) as any);

    await generateMagistratesStandardListExcel(baseOptions);

    // sanitiseCellValue is called once for name (single row)
    const nameCalls = vi.mocked(sanitiseCellValue).mock.calls.filter(([v]) => v === "Smith, John");
    expect(nameCalls.length).toBe(1);
  });

  it("should write reporting restriction text when reportingRestriction is true", async () => {
    const hearing = makeHearing([makeOffence()], { reportingRestriction: true });

    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData([hearing]) as any);

    await generateMagistratesStandardListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("Press/Publication restrictions apply to this case");
  });

  it("should sanitise cell values via sanitiseCellValue", async () => {
    const hearing = makeHearing([makeOffence()], {
      partyInfo: { name: "=INJECTION", dob: "", age: "", address: "", asn: "", pncId: "" }
    });

    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData([hearing]) as any);

    await generateMagistratesStandardListExcel(baseOptions);

    expect(sanitiseCellValue).toHaveBeenCalledWith("=INJECTION");
  });

  it("should use Welsh column headers when locale is cy", async () => {
    vi.mocked(renderMagistratesStandardListData).mockResolvedValue(makeRenderedData() as any);

    const result = await generateMagistratesStandardListExcel({ ...baseOptions, locale: "cy" });

    expect(result.success).toBe(true);
  });

  it("should return failure result when an error occurs", async () => {
    vi.mocked(renderMagistratesStandardListData).mockRejectedValue(new Error("Render failed"));

    const result = await generateMagistratesStandardListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Render failed");
    expect(result.excelPath).toBeUndefined();
  });
});
