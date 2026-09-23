import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCrownFirmListExcel } from "./excel-generator.js";

let capturedBuffer: Buffer | undefined;

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    saveExcelToStorage: vi.fn(async (_artefactId: string, buffer: Buffer) => {
      capturedBuffer = buffer;
      return { excelPath: `${_artefactId}.xlsx` };
    })
  };
});

vi.mock("../rendering/renderer.js", () => ({
  renderCrownFirmListData: vi.fn()
}));

import { saveExcelToStorage } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import { renderCrownFirmListData } from "../rendering/renderer.js";

const baseOptions = {
  artefactId: "test-id",
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  listTypeName: "CROWN_FIRM_LIST",
  jsonData: {} as any
};

function buildCase(overrides: Record<string, unknown> = {}) {
  return {
    caseNumber: "T20250001",
    timeMarkingNote: "Not before 11am",
    prosecutingAuthority: "CPS",
    listingNotes: "Note A",
    defendants: "Smith, John",
    representative: "Acme Solicitors",
    formattedReportingRestriction: "",
    ...overrides
  };
}

function buildRendered(groupedListData: unknown[]) {
  return { header: {}, openJustice: {}, listData: null, groupedListData };
}

function singleCaseTree(
  caseOverrides: Record<string, unknown> = {},
  courtHouseInfoOverrides: Record<string, unknown> = {},
  sittingOverrides: Record<string, unknown> = {}
) {
  return buildRendered([
    {
      day: "Monday 13 January 2025",
      courtHouseInfo: { name: "Manchester Crown Court", addressLines: [], phone: "", ...courtHouseInfoOverrides },
      sittings: [
        {
          courtRoomName: "Court 1",
          formattedJudiciaries: "HHJ Bloggs",
          time: "10:00am",
          ...sittingOverrides,
          hearing: [{ displayHearingType: "Trial", case: [buildCase(caseOverrides)] }]
        }
      ]
    }
  ]);
}

async function readWorksheet() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  return workbook.worksheets[0];
}

describe("generateCrownFirmListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBuffer = undefined;
  });

  it("should return success and name the worksheet 'Crown Firm List'", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree() as any);

    const result = await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(result.success).toBe(true);
    expect(result.excelPath).toBe("test-id.xlsx");
    expect(worksheet.name).toBe("Crown Firm List");
  });

  it("should write a bold English header row including Date and Representative in order", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree() as any);

    await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const header = worksheet.getRow(1);

    expect(header.values).toEqual([
      undefined,
      "Sitting Date",
      "Court House",
      "Court Address",
      "Court Phone Number",
      "Court Room",
      "Sitting at",
      "Hearing Time",
      "Case Number",
      "Defendant Name(s)",
      "Hearing Type",
      "Representative",
      "Prosecuting Authority",
      "Listing Notes"
    ]);
    expect(header.font?.bold).toBe(true);
  });

  it("should write Welsh header labels when the locale is cy", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree() as any);

    await generateCrownFirmListExcel({ ...baseOptions, locale: "cy" });
    const worksheet = await readWorksheet();
    const header = worksheet.getRow(1);

    expect(header.getCell(3).value).toBe("Cyfeiriad y Llys");
    expect(header.getCell(4).value).toBe("Rhif ffôn y Llys");
    expect(header.getCell(6).value).toBe("Yn eistedd am");
    expect(header.getCell(11).value).toBe("Cynrychiolir gan");
  });

  it("should write one row per case with court address, phone and the judge folded into the court room column", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(
      singleCaseTree({}, { addressLines: ["1 Court Street", "Manchester", "M1 1AA"], phone: "0161 123 4567" }) as any
    );

    await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const row = worksheet.getRow(2);

    expect(row.getCell(1).value).toBe("Monday 13 January 2025");
    expect(row.getCell(2).value).toBe("Manchester Crown Court");
    expect(row.getCell(3).value).toBe("1 Court Street, Manchester, M1 1AA");
    expect(row.getCell(4).value).toBe("0161 123 4567");
    expect(row.getCell(5).value).toBe("Courtroom Court 1: HHJ Bloggs");
    expect(row.getCell(6).value).toBe("10:00am");
    expect(row.getCell(7).value).toBe("Not before 11am");
    expect(row.getCell(8).value).toBe("T20250001");
    expect(row.getCell(9).value).toBe("Smith, John");
    expect(row.getCell(10).value).toBe("Trial");
    expect(row.getCell(11).value).toBe("Acme Solicitors");
    expect(row.getCell(12).value).toBe("CPS");
    expect(row.getCell(13).value).toBe("Note A");
  });

  it("should render the court room without a judge suffix when there are no judiciaries", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree({}, {}, { formattedJudiciaries: "" }) as any);

    await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.getRow(2).getCell(5).value).toBe("Courtroom Court 1");
  });

  it("should leave empty optional fields as empty cells", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree({ representative: "", listingNotes: "" }) as any);

    await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const row = worksheet.getRow(2);

    expect(row.getCell(11).value ?? "").toBe("");
    expect(row.getCell(13).value ?? "").toBe("");
  });

  it("should prefix a value beginning with an injection character with an apostrophe", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree({ defendants: "@evil" }) as any);

    await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.getRow(2).getCell(9).value).toBe("'@evil");
  });

  it("should keep en and cy excelColumns keys in parity", async () => {
    expect(Object.keys(enLocale.excelColumns).sort()).toEqual(Object.keys(cyLocale.excelColumns).sort());
  });

  it("should produce a header-only workbook when there are no sitting days", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(buildRendered([]) as any);

    const result = await generateCrownFirmListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(result.success).toBe(true);
    expect(worksheet.rowCount).toBe(1);
  });

  it("should return failure without throwing when the renderer rejects", async () => {
    vi.mocked(renderCrownFirmListData).mockRejectedValue(new Error("Render failed"));

    const result = await generateCrownFirmListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to generate Crown Firm List Excel: Render failed");
  });

  it("should return failure without throwing when the upload rejects", async () => {
    vi.mocked(renderCrownFirmListData).mockResolvedValue(singleCaseTree() as any);
    vi.mocked(saveExcelToStorage).mockRejectedValueOnce(new Error("Upload failed"));

    const result = await generateCrownFirmListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload failed");
  });
});
