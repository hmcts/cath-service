import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/interim-applications-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { InterimApplicationsData } from "../models/types.js";
import { reformatInterimApplicationsDailyCauseListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "INTERIM_APPLICATIONS_DAILY_CAUSE_LIST";
const FIELD_ORDER = ["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"] as const;
const UPLOADED_HEADER = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information", "Internal notes"];
const HEARING_ROWS = [
  ["Mr Justice Smith", "10.30am", "Court 1", "Interim application", "BL-2025-001", "Smith v Jones", "Remote", "Vulnerable party"],
  ["Mrs Justice Brown", "2pm", "Court 2", "Injunction", "BL-2025-002", "Acme v Widget", "In person", "Do not publish"]
];

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheets: Record<string, unknown[][]> = {
    "Hearing List": [UPLOADED_HEADER, ...HEARING_ROWS],
    "Open Justice Statement Details": [
      ["Name to be displayed", "Email"],
      ["Mr Justice Smith", "interim.applications@justice.gov.uk"]
    ],
    Notes: [UPLOADED_HEADER, ["Judge X", "9am", "Court 9", "Note", "N-1", "Working copy", "None", "Draft"]]
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

describe("reformatInterimApplicationsDailyCauseListExcel", () => {
  it("should write the English headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatInterimApplicationsDailyCauseListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet("Hearing List");
    expect(rowValues(worksheet, 1)).toEqual(headings(en));
    for (let colNumber = 1; colNumber <= FIELD_ORDER.length; colNumber++) {
      expect(worksheet?.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should write the Welsh headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatInterimApplicationsDailyCauseListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.getWorksheet("Hearing List"), 1)).toEqual(headings(cy));
  });

  it("should match the hearings the PDF prints without reformatting the time", async () => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as InterimApplicationsData;

    // Act
    const workbook = await load(await reformatInterimApplicationsDailyCauseListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet("Hearing List");
    const expectedRows = converted.hearingList.map((hearing) => FIELD_ORDER.map((field) => hearing[field]));
    expect([rowValues(worksheet, 2), rowValues(worksheet, 3)]).toEqual(expectedRows);
    expect(worksheet?.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)[1]).toBe("10.30am");
  });

  it("should output only the Hearing List tab", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatInterimApplicationsDailyCauseListExcel(upload, "en"));

    // Assert
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Hearing List"]);
    expect(workbook.getWorksheet("Open Justice Statement Details")).toBeUndefined();
  });

  it("should drop the extra column", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatInterimApplicationsDailyCauseListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.getWorksheet("Hearing List");
    expect(worksheet?.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2)]).not.toContain("Vulnerable party");
  });
});
