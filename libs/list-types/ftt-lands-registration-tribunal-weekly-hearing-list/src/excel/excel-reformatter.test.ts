import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/ftt-lrt-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { FttLrtHearingList } from "../models/types.js";
import { renderFttLrtData } from "../rendering/renderer.js";
import { reformatFttLrtWeeklyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "FTT_LR_WEEKLY_HEARING_LIST";
const FIELD_ORDER = ["date", "hearingTime", "caseName", "caseReferenceNumber", "judge", "venuePlatform"] as const;
const UPLOADED_HEADER = ["Date", "Hearing Time", "Case Name", "Case Reference Number", "Judge", "Venue/Platform", "Internal notes"];
const HEARING_ROWS = [
  ["15/01/2026", "10.30am", "A Smith v B Jones", "REF/2026/001", "Judge Jones", "Alfred Place", "Vulnerable party"],
  ["16/01/2026", "2pm", "C Brown v D Green", "REF/2026/002", "Judge Khan", "Video", "Do not publish"]
];
const SHEET_NAME = "LRT hearings";

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheets: Record<string, unknown[][]> = {
    [SHEET_NAME]: [UPLOADED_HEADER, ...HEARING_ROWS],
    Notes: [UPLOADED_HEADER, ["17/01/2026", "9am", "Working copy", "REF/2026/999", "None", "None", "Draft"]]
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
  const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as FttLrtHearingList;
  const { hearings } = renderFttLrtData(converted, {
    locale,
    courtName: "First-tier Tribunal",
    contentDate: new Date("2026-01-12T00:00:00Z"),
    lastReceivedDate: "2026-01-11T09:00:00Z",
    listTitle: "Land Registration Tribunal Weekly Hearing List"
  });
  return hearings.map((hearing) => FIELD_ORDER.map((field) => hearing[field]));
}

describe("reformatFttLrtWeeklyHearingListExcel", () => {
  it("should write the English headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttLrtWeeklyHearingListExcel(upload, "en"));

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
    const workbook = await load(await reformatFttLrtWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.getWorksheet(SHEET_NAME), 1)).toEqual(headings(cy));
  });

  it.each(["en", "cy"])("should match the hearings the %s PDF prints", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const expectedRows = await renderedRows(upload, locale);

    // Act
    const workbook = await load(await reformatFttLrtWeeklyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect([rowValues(worksheet, 2), rowValues(worksheet, 3)]).toEqual(expectedRows);
    expect(worksheet?.rowCount).toBe(3);
  });

  it.each([
    ["en", "15 January 2026"],
    ["cy", "15 Ionawr 2026"]
  ])("should write the %s long date and keep the uploaded time", async (locale, expectedDate) => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttLrtWeeklyHearingListExcel(upload, locale));

    // Assert
    const row = rowValues(workbook.getWorksheet(SHEET_NAME), 2);
    expect(row[0]).toBe(expectedDate);
    expect(row[1]).toBe("10.30am");
  });

  it("should output only the uploaded first sheet without the extra column", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatFttLrtWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet?.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2)]).not.toContain("Vulnerable party");
  });
});
