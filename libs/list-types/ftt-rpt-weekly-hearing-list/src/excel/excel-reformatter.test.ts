import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/ftt-rpt-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { FttRptHearingList } from "../models/types.js";
import { renderFttRptData } from "../rendering/renderer.js";
import { reformatFttRptWeeklyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "FTT_RPT_LONDON_WEEKLY_HEARING_LIST";
const FIELD_ORDER = ["date", "time", "venue", "caseType", "caseReferenceNumber", "judges", "members", "hearingMethod", "additionalInformation"] as const;
const UPLOADED_HEADER = [
  "Date",
  "Time",
  "Venue",
  "Case Type",
  "Case Reference Number",
  "Judge(s)",
  "Member(s)",
  "Hearing Method",
  "Additional Information",
  "Internal notes"
];
const HEARING_ROWS = [
  ["15/01/2026", "10.30am", "10 Alfred Place", "Rent repairs", "LON/00AA/2026/0001", "Judge Jones", "Mr Patel", "In person", "None", "Vulnerable party"],
  ["16/01/2026", "2pm", "Video", "Service charges", "LON/00AA/2026/0002", "Judge Khan", "Ms Green", "Video", "Interpreter required", "Do not publish"]
];
const SHEET_NAME = "RPT London";

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheets: Record<string, unknown[][]> = {
    [SHEET_NAME]: [UPLOADED_HEADER, ...HEARING_ROWS],
    Notes: [UPLOADED_HEADER, ["17/01/2026", "9am", "None", "Working copy", "LON/00AA/2026/9999", "None", "None", "None", "None", "Draft"]]
  };
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    for (const row of rows) {
      worksheet.addRow(row);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  return workbook;
}

function rowValues(worksheet: ExcelJS.Worksheet | undefined, rowNumber: number): unknown[] {
  if (!worksheet) {
    throw new Error("Worksheet not found");
  }
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

function headings(t: typeof en | typeof cy): string[] {
  return FIELD_ORDER.map((field) => t.tableHeaders[field]);
}

async function renderedRows(upload: Buffer, locale: string): Promise<string[][]> {
  const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as FttRptHearingList;
  const { hearings } = renderFttRptData(converted, {
    locale,
    courtName: "First-tier Tribunal",
    contentDate: new Date("2026-01-12T00:00:00Z"),
    lastReceivedDate: "2026-01-11T09:00:00Z",
    listTitle: "Residential Property Tribunal: London Weekly Hearing List"
  });
  return hearings.map((hearing) => FIELD_ORDER.map((field) => hearing[field]));
}

describe("reformatFttRptWeeklyHearingListExcel", () => {
  it("should write the English headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttRptWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    for (let colNumber = 1; colNumber <= FIELD_ORDER.length; colNumber++) {
      expect(worksheet?.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should write the Welsh headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttRptWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.getWorksheet(SHEET_NAME), 1)).toEqual(headings(cy));
  });

  it.each(["en", "cy"])("should match the non-date hearing fields the %s PDF prints", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const expectedRows = await renderedRows(upload, locale);
    const nonDateColumns = FIELD_ORDER.map((_, index) => index).filter((index) => FIELD_ORDER[index] !== "date");

    // Act
    const workbook = await load(await reformatFttRptWeeklyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    const actualRows = [rowValues(worksheet, 2), rowValues(worksheet, 3)].map((row) => nonDateColumns.map((index) => row[index]));
    const expectedNonDateRows = expectedRows.map((row) => nonDateColumns.map((index) => row[index]));
    expect(actualRows).toEqual(expectedNonDateRows);
    expect(worksheet?.rowCount).toBe(3);
  });

  it.each(["en", "cy"])("should keep the uploaded date and time exactly as uploaded, not the PDF's long date", async (locale) => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttRptWeeklyHearingListExcel(upload, locale));

    // Assert
    const row = rowValues(workbook.getWorksheet(SHEET_NAME), 2);
    expect(row[0]).toBe("15/01/2026");
    expect(row[1]).toBe("10.30am");
  });

  it("should output only the uploaded first sheet without the extra column", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttRptWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet?.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2)]).not.toContain("Vulnerable party");
  });
});
