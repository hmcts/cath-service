import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/siac-poac-paac-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { SiacPoacPaacHearingList } from "../models/types.js";
import { renderSiacPoacPaacData } from "../rendering/renderer.js";
import { reformatSiacPoacPaacWeeklyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAMES = ["SIAC_WEEKLY_HEARING_LIST", "POAC_WEEKLY_HEARING_LIST", "PAAC_WEEKLY_HEARING_LIST"];
const SHEET_NAME = "Commission hearings";
const FIELD_ORDER = ["date", "time", "appellant", "caseReferenceNumber", "hearingType", "courtroom", "additionalInformation"] as const;
const UPLOADED_HEADER = ["Date", "Time", "Appellant", "Case Reference Number", "Hearing Type", "Courtroom", "Additional information", "Internal notes"];
const HEARING_ROWS = [
  ["02/01/2025", "10.30am", "AB", "SC/123/2025", "Substantive", "Court 1", "Closed session", "Vulnerable party"],
  ["15/01/2025", "2pm", "CD", "SC/456/2025", "Review", "Court 2", "Open session", "Do not publish"]
];

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hearings = workbook.addWorksheet(SHEET_NAME);
  for (const row of [UPLOADED_HEADER, ...HEARING_ROWS]) {
    hearings.addRow(row);
  }
  const workingCopy = workbook.addWorksheet("Working copy", { state: "hidden" });
  workingCopy.addRow(UPLOADED_HEADER);
  workingCopy.addRow(["03/01/2025", "9am", "Draft", "Draft", "Draft", "Draft", "Draft", "Draft"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  return workbook;
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

function headings(t: typeof en | typeof cy): string[] {
  return FIELD_ORDER.map((field) => t.tableHeaders[field]);
}

describe("reformatSiacPoacPaacWeeklyHearingListExcel", () => {
  it("should write the English PDF table headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    for (let colNumber = 1; colNumber <= FIELD_ORDER.length; colNumber++) {
      expect(worksheet.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should write the cy locale table headings, which match the Welsh PDF", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.worksheets[0], 1)).toEqual(headings(cy));
  });

  it.each(LIST_TYPE_NAMES)("should accept the upload for %s through the shared converter", async (listTypeName) => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const converted = (await convertExcelForListTypeName(listTypeName, upload)) as unknown as SiacPoacPaacHearingList;

    // Assert
    expect(converted).toHaveLength(HEARING_ROWS.length);
  });

  it.each(["en", "cy"])("should write the same rows as the PDF for the %s locale", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAMES[0], upload)) as unknown as SiacPoacPaacHearingList;
    const { hearings } = renderSiacPoacPaacData(converted, {
      locale,
      courtName: en.siacCourtName,
      contentDate: new Date("2025-01-01T00:00:00Z"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: en.siacPageTitle
    });

    // Act
    const workbook = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(worksheet.actualRowCount - 1).toBe(hearings.length);
    hearings.forEach((hearing, index) => {
      expect(rowValues(worksheet, index + 2)).toEqual(FIELD_ORDER.map((field) => hearing[field]));
    });
  });

  it("should write the hearing date in long form and the time with a colon, as legacy does", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const english = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, "en"));
    const welsh = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(english.worksheets[0].getCell("A2").value).toBe("2 January 2025");
    expect(welsh.worksheets[0].getCell("A2").value).toBe("2 Ionawr 2025");
    expect(english.worksheets[0].getCell("B2").value).toBe("10:30am");
  });

  it("should drop the Internal notes column and the second sheet but keep the sheet name", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSiacPoacPaacWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2), ...rowValues(worksheet, 3)]).not.toContain("Vulnerable party");
    expect(rowValues(worksheet, 1)).not.toContain("Internal notes");
  });
});
