import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/send-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { SendDailyHearingList } from "../models/types.js";
import { renderSendDailyHearingListData } from "../rendering/renderer.js";
import { reformatSendDailyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "SEND_DAILY_HEARING_LIST";
const FIELD_ORDER = ["time", "caseReferenceNumber", "respondent", "hearingType", "venue", "timeEstimate"] as const;
const UPLOADED_HEADER = ["Time", "Case reference number", "Respondent", "Hearing type", "Venue", "Time estimate", "Internal notes"];
const HEARING_ROWS = [
  ["10.30am", "SE/2026/001", "Example Council", "Final hearing", "Video", "2 hours", "Vulnerable party"],
  ["2pm", "SE/2026/002", "Another Council", "Case management", "In person", "1 hour", "Do not publish"]
];
const SHEET_NAME = "SEND hearings";

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheets: Record<string, unknown[][]> = {
    [SHEET_NAME]: [UPLOADED_HEADER, ...HEARING_ROWS],
    Notes: [UPLOADED_HEADER, ["9am", "SE/2026/999", "Working copy", "None", "None", "None", "Draft"]]
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
  const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as SendDailyHearingList;
  const { hearings } = renderSendDailyHearingListData(converted, {
    locale,
    contentDate: new Date("2026-01-12T00:00:00Z"),
    lastReceivedDate: "2026-01-11T09:00:00Z",
    listTitle: "SEND Daily Hearing List"
  });
  return hearings.map((hearing) => FIELD_ORDER.map((field) => hearing[field]));
}

describe("reformatSendDailyHearingListExcel", () => {
  it("should write the English headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSendDailyHearingListExcel(upload, "en"));

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
    const workbook = await load(await reformatSendDailyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.getWorksheet(SHEET_NAME), 1)).toEqual(headings(cy));
  });

  it.each(["en", "cy"])("should match the hearings the %s PDF prints", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const expectedRows = await renderedRows(upload, locale);

    // Act
    const workbook = await load(await reformatSendDailyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect([rowValues(worksheet, 2), rowValues(worksheet, 3)]).toEqual(expectedRows);
    expect(worksheet?.rowCount).toBe(3);
  });

  it("should keep the uploaded time", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSendDailyHearingListExcel(upload, "en"));

    // Assert
    expect(rowValues(workbook.getWorksheet(SHEET_NAME), 2)[0]).toBe("10.30am");
  });

  it("should output only the uploaded first sheet without the extra column", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatSendDailyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet(SHEET_NAME);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet?.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2)]).not.toContain("Vulnerable party");
  });
});
