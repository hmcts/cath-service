import { uploadBlob } from "@hmcts/azure-blob";
import { convertExcelToJson } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SSCS_EXCEL_CONFIG } from "../conversion/sscs-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { SscsDailyHearing, SscsDailyHearingList } from "../models/types.js";
import { generateSscsDailyHearingListExcel } from "./excel-generator.js";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn()
}));

const ARTEFACT_ID = "sscs-artefact";
const FIELD_ORDER: (keyof SscsDailyHearing)[] = [
  "venue",
  "appealReferenceNumber",
  "hearingType",
  "appellant",
  "courtroom",
  "hearingTime",
  "tribunal",
  "respondent",
  "additionalInformation"
];
const INVALID_SHEET_NAME_CHARS = /[*?:\\/[\]]/;
const MAX_SHEET_NAME_LENGTH = 31;

function buildHearing(overrides: Partial<SscsDailyHearing> = {}): SscsDailyHearing {
  return {
    venue: "Liverpool Tribunal",
    appealReferenceNumber: "SC123/45/67890",
    hearingType: "Oral",
    appellant: "A Smith",
    courtroom: "Room 1",
    hearingTime: "10:30am",
    tribunal: "Judge Jones\nDr Patel",
    respondent: "DWP",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

async function generate(jsonData: SscsDailyHearingList, locale = "en"): Promise<ExcelJS.Worksheet> {
  const result = await generateSscsDailyHearingListExcel({ artefactId: ARTEFACT_ID, locale, jsonData });
  expect(result).toEqual({ success: true, excelPath: `${ARTEFACT_ID}.xlsx` });

  const [blobName, buffer, , container] = vi.mocked(uploadBlob).mock.calls[0];
  expect(blobName).toBe(`${ARTEFACT_ID}.xlsx`);
  expect(container).toBe("publications");
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  expect(workbook.worksheets).toHaveLength(1);
  return workbook.worksheets[0];
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

function headings(t: typeof en | typeof cy): string[] {
  return FIELD_ORDER.map((field) => t.tableHeaders[field]);
}

async function buildUpload(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Upload");
  for (const row of rows) {
    worksheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("generateSscsDailyHearingListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadBlob).mockResolvedValue(undefined);
  });

  it("should write the English PDF table headings in bold on a frozen header row", async () => {
    // Arrange
    const jsonData = [buildHearing()];

    // Act
    const worksheet = await generate(jsonData, "en");

    // Assert
    expect(worksheet.name).toBe(en.excelWorksheetName);
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    expect(worksheet.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(worksheet.views).toEqual([expect.objectContaining({ state: "frozen", ySplit: 1 })]);
  });

  it("should write the Welsh headings and sheet name when the locale is cy", async () => {
    // Arrange
    const jsonData = [buildHearing()];

    // Act
    const worksheet = await generate(jsonData, "cy");

    // Assert
    expect(worksheet.name).toBe(cy.excelWorksheetName);
    expect(rowValues(worksheet, 1)).toEqual(headings(cy));
  });

  it("should write one row per hearing with the values in the PDF column order", async () => {
    // Arrange
    const jsonData = [buildHearing(), buildHearing({ appealReferenceNumber: "SC987/65/43210", hearingType: "Paper", additionalInformation: "" })];

    // Act
    const worksheet = await generate(jsonData);

    // Assert
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)).toEqual(FIELD_ORDER.map((field) => jsonData[0][field]));
    expect(rowValues(worksheet, 3).slice(0, 8)).toEqual(FIELD_ORDER.slice(0, 8).map((field) => jsonData[1][field]));
    expect(worksheet.getRow(3).getCell(9).text).toBe("");
  });

  it("should write the same values the converter produces for the PDF from an uploaded Excel", async () => {
    // Arrange
    const upload = await buildUpload([
      SSCS_EXCEL_CONFIG.fields.map((field) => field.header),
      ["Leeds Tribunal", "SC111/22/33333", "Oral", "C Jones", "Room 3", "11am", "Judge Khan", "HMRC", "Hearing loop"]
    ]);
    const converted = await convertExcelToJson<SscsDailyHearing>(upload, SSCS_EXCEL_CONFIG);

    // Act
    const worksheet = await generate(converted);

    // Assert
    expect(worksheet.rowCount).toBe(converted.length + 1);
    expect(rowValues(worksheet, 2)).toEqual(FIELD_ORDER.map((field) => converted[0][field]));
  });

  it("should write a header-only sheet when there are no hearings", async () => {
    // Act
    const worksheet = await generate([]);

    // Assert
    expect(worksheet.rowCount).toBe(1);
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
  });

  it.each(['=HYPERLINK("http://evil")', "+1", "-1", "@SUM(A1)"])("should neutralise the formula-like value %s", async (value) => {
    // Arrange
    const jsonData = [buildHearing({ appellant: value })];

    // Act
    const worksheet = await generate(jsonData);

    // Assert
    const cell = worksheet.getRow(2).getCell(FIELD_ORDER.indexOf("appellant") + 1);
    expect(cell.value).toBe(`'${value}`);
    expect(cell.formula).toBeUndefined();
  });

  it("should return a failure when saving the Excel fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValue(new Error("Storage unavailable"));

    // Act
    const result = await generateSscsDailyHearingListExcel({ artefactId: ARTEFACT_ID, locale: "en", jsonData: [buildHearing()] });

    // Assert
    expect(result).toEqual({ success: false, error: "Failed to generate SSCS Excel: Storage unavailable" });
  });

  it("should return a failure with the value when a non-Error is thrown", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValue("Upload failed");

    // Act
    const result = await generateSscsDailyHearingListExcel({ artefactId: ARTEFACT_ID, locale: "en", jsonData: [buildHearing()] });

    // Assert
    expect(result).toEqual({ success: false, error: "Failed to generate SSCS Excel: Upload failed" });
  });

  it.each([
    ["en", en.excelWorksheetName],
    ["cy", cy.excelWorksheetName]
  ])("should use a valid Excel sheet name for %s", (_locale, sheetName) => {
    // Assert
    expect(sheetName.length).toBeGreaterThan(0);
    expect(sheetName.length).toBeLessThanOrEqual(MAX_SHEET_NAME_LENGTH);
    expect(sheetName).not.toMatch(INVALID_SHEET_NAME_CHARS);
  });
});
