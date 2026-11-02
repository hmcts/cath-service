import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/ast-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { AstDailyHearingList } from "../models/types.js";
import { renderAstDailyHearingListData } from "../rendering/renderer.js";
import { reformatAstDailyHearingListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "AST_DAILY_HEARING_LIST";
const SHEET_NAME = "AST hearings";
const FIELD_ORDER = ["appellant", "appealReferenceNumber", "caseType", "hearingType", "hearingTime", "additionalInformation"] as const;
const UPLOADED_HEADER = ["Appellant", "Appeal reference number", "Case type", "Hearing type", "Hearing time", "Additional information", "Internal notes"];
const HEARING_ROWS = [
  ["AB", "AS/2025/001", "Section 95", "Oral", "10.30am", "Interpreter required", "Vulnerable party"],
  ["CD", "AS/2025/002", "Section 4", "Paper", "2pm", "None", "Do not publish"]
];

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hearings = workbook.addWorksheet(SHEET_NAME);
  for (const row of [UPLOADED_HEADER, ...HEARING_ROWS]) {
    hearings.addRow(row);
  }
  const workingCopy = workbook.addWorksheet("Working copy", { state: "hidden" });
  workingCopy.addRow(UPLOADED_HEADER);
  workingCopy.addRow(["Draft", "Draft", "Draft", "Draft", "9am", "Draft", "Draft"]);
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

describe("reformatAstDailyHearingListExcel", () => {
  it("should write the English PDF table headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAstDailyHearingListExcel(upload, "en"));

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
    const workbook = await load(await reformatAstDailyHearingListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.worksheets[0], 1)).toEqual(headings(cy));
  });

  it.each(["en", "cy"])("should write the same rows as the PDF for the %s locale", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as AstDailyHearingList;
    const { hearings } = renderAstDailyHearingListData(converted, {
      locale,
      contentDate: new Date("2025-01-01T00:00:00Z"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: en.pageTitle
    });

    // Act
    const workbook = await load(await reformatAstDailyHearingListExcel(upload, locale));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(worksheet.actualRowCount - 1).toBe(hearings.length);
    hearings.forEach((hearing, index) => {
      expect(rowValues(worksheet, index + 2)).toEqual(FIELD_ORDER.map((field) => hearing[field]));
    });
  });

  it("should write every value as uploaded except the hearing time, which gets a colon as legacy does", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAstDailyHearingListExcel(upload, "cy"));

    // Assert
    const worksheet = workbook.worksheets[0];
    const timeIndex = FIELD_ORDER.indexOf("hearingTime");
    HEARING_ROWS.forEach((row, index) => {
      const expected = row.slice(0, FIELD_ORDER.length).map((value, column) => (column === timeIndex ? value.replace(".", ":") : value));
      expect(rowValues(worksheet, index + 2)).toEqual(expected);
    });
    expect(worksheet.getRow(2).getCell(timeIndex + 1).value).toBe("10:30am");
  });

  it("should drop the Internal notes column and the second sheet but keep the sheet name", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAstDailyHearingListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2), ...rowValues(worksheet, 3)]).not.toContain("Vulnerable party");
    expect(rowValues(worksheet, 1)).not.toContain("Internal notes");
  });
});
