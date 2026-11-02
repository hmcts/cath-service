import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/cic-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { CicWeeklyHearingList } from "../models/types.js";
import { renderCicWeeklyHearingListData } from "../rendering/renderer.js";
import { reformatCicWeeklyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "CIC_WEEKLY_HEARING_LIST";
const SHEET_NAME = "CIC hearings";
const FIELD_ORDER = ["date", "hearingTime", "caseReferenceNumber", "caseName", "venuePlatform", "judges", "members", "additionalInformation"] as const;
const UPLOADED_HEADER = [
  "Date",
  "Hearing time",
  "Case reference number",
  "Case name",
  "Venue/platform",
  "Judge(s)",
  "Member(s)",
  "Additional information",
  "Internal notes"
];
const HEARING_ROWS = [
  ["02/01/2025", "10:30am", "CIC/2025/001", "AN Other v CICA", "Video", "Judge Jones", "Dr Patel", "Remote", "Vulnerable party"],
  ["15/01/2025", "2pm", "CIC/2025/002", "AB v CICA", "Glasgow Tribunal Centre", "Judge Lee", "Mr Smith", "In person", "Do not publish"]
];
const VENUE_COLUMN = FIELD_ORDER.indexOf("venuePlatform") + 1;

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hearings = workbook.addWorksheet(SHEET_NAME);
  for (const row of [UPLOADED_HEADER, ...HEARING_ROWS]) {
    hearings.addRow(row);
  }
  const workingCopy = workbook.addWorksheet("Working copy", { state: "hidden" });
  workingCopy.addRow(UPLOADED_HEADER);
  workingCopy.addRow(["03/01/2025", "9am", "Draft", "Draft", "Draft", "Draft", "Draft", "Draft", "Draft"]);
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

describe("reformatCicWeeklyHearingListExcel", () => {
  it("should write the English PDF table headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCicWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    for (let colNumber = 1; colNumber <= FIELD_ORDER.length; colNumber++) {
      expect(worksheet.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should write the Welsh PDF table headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCicWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.worksheets[0], 1)).toEqual(headings(cy));
  });

  it("should write the Welsh venue heading rather than the uploaded one", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCicWeeklyHearingListExcel(upload, "cy"));

    // Assert
    const heading = workbook.worksheets[0].getRow(1).getCell(VENUE_COLUMN).value;
    expect(heading).toBe("Lleoliad/Platfform");
    expect(heading).not.toBe("Venue/platform");
  });

  it.each(["en", "cy"])("should write the same rows as the PDF for the %s locale", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as CicWeeklyHearingList;
    const { hearings } = renderCicWeeklyHearingListData(converted, {
      locale,
      contentDate: new Date("2025-01-01T00:00:00Z"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: en.pageTitle
    });

    // Act
    const workbook = await load(await reformatCicWeeklyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(worksheet.actualRowCount - 1).toBe(hearings.length);
    hearings.forEach((hearing, index) => {
      expect(rowValues(worksheet, index + 2)).toEqual(FIELD_ORDER.map((field) => hearing[field]));
    });
  });

  it("should write the hearing date in long form", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const english = await load(await reformatCicWeeklyHearingListExcel(upload, "en"));
    const welsh = await load(await reformatCicWeeklyHearingListExcel(upload, "cy"));

    // Assert
    expect(english.worksheets[0].getCell("A2").value).toBe("2 January 2025");
    expect(welsh.worksheets[0].getCell("A2").value).toBe("2 Ionawr 2025");
  });

  it("should drop the Internal notes column and the second sheet but keep the sheet name", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCicWeeklyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2), ...rowValues(worksheet, 3)]).not.toContain("Vulnerable party");
    expect(rowValues(worksheet, 1)).not.toContain("Internal notes");
  });
});
