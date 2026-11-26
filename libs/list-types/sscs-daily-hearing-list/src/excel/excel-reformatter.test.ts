import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SSCS_EXCEL_CONFIG } from "../conversion/sscs-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { reformatSscsDailyHearingListExcel } from "./excel-reformatter.js";

const UPLOADED_HEADER = [
  "Venue",
  "Appeal Reference Number",
  "Hearing Type",
  "Appellant",
  "Courtroom",
  "Hearing Time",
  "Tribunal",
  "FTA/Respondent",
  "Additional Information"
];
const UPLOADED_ROWS = [
  ["Liverpool Tribunal", "SC123/45/67890", "Oral", "A Smith", "Room 1", "10:30am", "Judge Jones", "DWP", "Interpreter required"],
  ["Liverpool Tribunal", "SC987/65/43210", "Paper", "B Brown", "Room 2", "2pm", "Judge Patel", "HMRC", ""]
];
const SHEET_NAME = "SSCS hearings";

async function buildUpload(rows: unknown[][] = [UPLOADED_HEADER, ...UPLOADED_ROWS]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);
  for (const row of rows) {
    worksheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function loadFirstSheet(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  return workbook.worksheets[0];
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

function headings(t: typeof en | typeof cy): string[] {
  return SSCS_EXCEL_CONFIG.fields.map((field) => t.tableHeaders[field.fieldName as keyof typeof t.tableHeaders]);
}

describe("reformatSscsDailyHearingListExcel", () => {
  it("should write the English PDF table headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "en"));

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    for (let colNumber = 1; colNumber <= UPLOADED_HEADER.length; colNumber++) {
      expect(worksheet.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should write the Welsh PDF table headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(headings(cy));
    expect(worksheet.getCell("A1").font?.bold).toBe(true);
  });

  it("should keep the uploaded sheet name", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "cy"));

    // Assert
    expect(worksheet.name).toBe(SHEET_NAME);
  });

  it("should write the same values and row count as the upload conversion used by the PDF", async () => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName("SSCS_LONDON_DAILY_HEARING_LIST", upload)) as Record<string, string>[];

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "en"));

    // Assert
    expect(worksheet.actualRowCount - 1).toBe(converted.length);
    converted.forEach((hearing, index) => {
      expect(rowValues(worksheet, index + 2)).toEqual(SSCS_EXCEL_CONFIG.fields.map((field) => hearing[field.fieldName]));
    });
  });

  it("should write an empty Additional Information as an empty string", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "en"));

    // Assert
    expect(worksheet.getRow(3).getCell(9).value).toBe("");
  });

  it("should drop an extra Internal notes column", async () => {
    // Arrange
    const upload = await buildUpload([
      [...UPLOADED_HEADER, "Internal notes"],
      [...UPLOADED_ROWS[0], "Appellant is vulnerable"]
    ]);

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "en"));

    // Assert
    expect(worksheet.columnCount).toBe(UPLOADED_HEADER.length);
    expect(rowValues(worksheet, 1)).not.toContain("Internal notes");
    expect(rowValues(worksheet, 2)).not.toContain("Appellant is vulnerable");
  });

  it("should give reordered columns the heading for their own field", async () => {
    // Arrange
    const reversedHeader = [...UPLOADED_HEADER].reverse();
    const reversedRow = [...UPLOADED_ROWS[0]].reverse();
    const upload = await buildUpload([reversedHeader, reversedRow]);

    // Act
    const worksheet = await loadFirstSheet(await reformatSscsDailyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(worksheet, 1)).toEqual([...headings(cy)].reverse());
    expect(rowValues(worksheet, 2)).toEqual(reversedRow);
  });
});
