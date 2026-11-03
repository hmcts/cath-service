import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { reformatRcjStandardDailyCauseListExcel } from "./excel-reformatter.js";

const UPLOADED_HEADER = ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information", "Notes"];
const UPLOADED_ROW = ["Court 1", "Mr Justice Smith", "10.30am", "KB-2025-001", "Smith v Jones", "Trial", "", "Bring bundle"];

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("KB hearings");
  worksheet.addRow(UPLOADED_HEADER);
  worksheet.addRow(UPLOADED_ROW);
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

describe("reformatRcjStandardDailyCauseListExcel", () => {
  it("should write the English PDF table headings in bold and drop unknown columns", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatRcjStandardDailyCauseListExcel(upload, "en"));

    // Assert
    const headers = en.common.tableHeaders;
    expect(rowValues(worksheet, 1)).toEqual([
      headers.venue,
      headers.judge,
      headers.time,
      headers.caseNumber,
      headers.caseDetails,
      headers.hearingType,
      headers.additionalInformation
    ]);
    expect(worksheet.getCell("A1").font?.bold).toBe(true);
    expect(worksheet.name).toBe("KB hearings");
  });

  it("should write the Welsh PDF table headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatRcjStandardDailyCauseListExcel(upload, "cy"));

    // Assert
    const headers = cy.common.tableHeaders;
    expect(rowValues(worksheet, 1)).toEqual([
      headers.venue,
      headers.judge,
      headers.time,
      headers.caseNumber,
      headers.caseDetails,
      headers.hearingType,
      headers.additionalInformation
    ]);
  });

  it("should format data values as shown in the PDF", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const worksheet = await loadFirstSheet(await reformatRcjStandardDailyCauseListExcel(upload, "en"));

    // Assert
    expect(rowValues(worksheet, 2)).toEqual(["Court 1", "Mr Justice Smith", "10:30am", "KB-2025-001", "Smith v Jones", "Trial", ""]);
  });
});
