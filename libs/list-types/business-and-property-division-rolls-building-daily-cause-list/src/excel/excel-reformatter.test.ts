import { convertExcelForListTypeName, normaliseHearings } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/business-and-property-division-rolls-building-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { BusinessAndPropertyRollsData, ChdKbHearing } from "../models/types.js";
import { SECTIONS } from "../sections.js";
import { reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAME = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const FIELD_ORDER = ["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"] as const;
const UPLOADED_HEADER = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information", "Internal notes"];

const APPEAL_ROWS = [
  ["Mr Justice Smith", "10.30am", "Court 1", "Appeal", "BL-2025-001", "Smith v Jones", "Remote", "Vulnerable party"],
  ["Mrs Justice Brown", "2pm", "Court 2", "Hearing", "BL-2025-002", "Acme v Widget", "In person", "Do not publish"]
];
const INSOLVENCY_ROWS = [["ICC Judge Green", "11.15am", "Court 7", "Winding up", "CR-2025-010", "Re Example Ltd", "Hybrid", "Staff only"]];

function buildWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const sheets: Record<string, unknown[][]> = {
    Notes: [UPLOADED_HEADER, ["Judge X", "9am", "Court 9", "Note", "N-1", "Working copy", "None", "Draft"]],
    "Insolvency & Companies Court": [UPLOADED_HEADER, ...INSOLVENCY_ROWS],
    "Appeal List": [UPLOADED_HEADER, ...APPEAL_ROWS],
    "Commercial Court": [UPLOADED_HEADER],
    "Staff only": [UPLOADED_HEADER, ["Judge Y", "9am", "Court 8", "Private", "P-1", "Secret v Hidden", "None", "Secret"]]
  };
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    for (const row of rows) {
      worksheet.addRow(row);
    }
  }
  (workbook.getWorksheet("Staff only") as ExcelJS.Worksheet).state = "hidden";
  return workbook;
}

async function buildUpload(workbook: ExcelJS.Workbook = buildWorkbook()): Promise<Buffer> {
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

function dataRows(worksheet: ExcelJS.Worksheet | undefined): unknown[][] {
  if (!worksheet) {
    throw new Error("Worksheet not found");
  }
  return Array.from({ length: worksheet.rowCount - 1 }, (_, index) => rowValues(worksheet, index + 2));
}

function headings(t: typeof en | typeof cy): string[] {
  return FIELD_ORDER.map((field) => t.tableHeaders[field]);
}

describe("reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel", () => {
  it("should write the English headings in bold on every section tab", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    for (const worksheet of workbook.worksheets) {
      expect(rowValues(worksheet, 1)).toEqual(headings(en));
      for (let colNumber = 1; colNumber <= FIELD_ORDER.length; colNumber++) {
        expect(worksheet.getRow(1).getCell(colNumber).font?.bold).toBe(true);
      }
    }
  });

  it("should write the Welsh headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "cy"));

    // Assert
    for (const worksheet of workbook.worksheets) {
      expect(rowValues(worksheet, 1)).toEqual(headings(cy));
    }
  });

  it("should output only the uploaded section tabs in section order with their uploaded names", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Appeal List", "Commercial Court", "Insolvency & Companies Court"]);
  });

  it("should drop the extra Notes tab and the hidden tab", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    expect(workbook.getWorksheet("Notes")).toBeUndefined();
    expect(workbook.getWorksheet("Staff only")).toBeUndefined();
  });

  it("should keep a header-only section tab", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    const commercial = workbook.getWorksheet("Commercial Court");
    expect(rowValues(commercial, 1)).toEqual(headings(en));
    expect(commercial?.rowCount).toBe(1);
  });

  it("should match the hearings the PDF prints for every uploaded section", async () => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAME, upload)) as unknown as BusinessAndPropertyRollsData;

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    for (const section of SECTIONS) {
      const worksheet = workbook.getWorksheet(section.worksheetName);
      if (!worksheet) {
        continue;
      }
      const expectedRows = normaliseHearings(converted[section.key] ?? []).map((hearing: ChdKbHearing) => FIELD_ORDER.map((field) => hearing[field]));
      expect(dataRows(worksheet)).toEqual(expectedRows);
    }
    expect(rowValues(workbook.getWorksheet("Appeal List"), 2)[1]).toBe("10:30am");
  });

  it("should drop the Internal notes column", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(upload, "en"));

    // Assert
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.columnCount).toBe(FIELD_ORDER.length);
      expect(rowValues(worksheet, 1)).not.toContain("Internal notes");
    }
    expect(dataRows(workbook.getWorksheet("Appeal List")).flat()).not.toContain("Vulnerable party");
  });

  it("should write an empty additional information cell as an empty string", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Patents Court");
    worksheet.addRow(UPLOADED_HEADER.slice(0, 7));
    worksheet.addRow(["Judge Z", "9.45am", "Court 3", "Trial", "HP-1", "Patent v Holder"]);

    // Act
    const result = await load(await reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(await buildUpload(workbook), "en"));

    // Assert
    expect(rowValues(result.getWorksheet("Patents Court"), 2)).toEqual(["Judge Z", "9:45am", "Court 3", "Trial", "HP-1", "Patent v Holder", ""]);
  });

  it("should reject an upload where no tab matches a section name", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Sheet 1").addRow(UPLOADED_HEADER);

    // Act
    const result = reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(await buildUpload(workbook), "en");

    // Assert
    await expect(result).rejects.toThrow("No recognised worksheet to reformat");
  });
});
