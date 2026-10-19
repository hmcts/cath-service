import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { reformatCourtOfAppealCivilDailyCauseListExcel } from "./excel-reformatter.js";

const DAILY_HEADER = ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"];
const FUTURE_HEADER = ["Date", ...DAILY_HEADER];

async function buildUpload(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const daily = workbook.addWorksheet("Daily hearings");
  daily.addRow(DAILY_HEADER);
  daily.addRow(["Court 71", "Lord Justice Smith", "10.30am", "CA-2025-001", "A v B", "Appeal", ""]);
  const future = workbook.addWorksheet("Notice for future judgments");
  future.addRow(FUTURE_HEADER);
  future.addRow(["20/02/2025", "Court 72", "Lady Justice Jones", "2.00pm", "CA-2025-002", "C v D", "Judgment", "Reserved"]);
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

function hearingHeadings(t: typeof en | typeof cy): string[] {
  const h = t.tableHeaders;
  return [h.venue, h.judge, h.time, h.caseNumber, h.caseDetails, h.hearingType, h.additionalInformation];
}

describe("reformatCourtOfAppealCivilDailyCauseListExcel", () => {
  it("should reformat the daily hearings sheet without a date heading", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCourtOfAppealCivilDailyCauseListExcel(upload, "en"));

    // Assert
    const daily = workbook.getWorksheet("Daily hearings");
    expect(rowValues(daily, 1)).toEqual(hearingHeadings(en));
    expect(rowValues(daily, 1)).not.toContain(en.tableHeaders.date);
    expect(rowValues(daily, 2)).toEqual(["Court 71", "Lord Justice Smith", "10:30am", "CA-2025-001", "A v B", "Appeal", ""]);
  });

  it("should reformat the future judgments sheet with an English formatted date", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCourtOfAppealCivilDailyCauseListExcel(upload, "en"));

    // Assert
    const future = workbook.getWorksheet("Notice for future judgments");
    expect(rowValues(future, 1)).toEqual([en.tableHeaders.date, ...hearingHeadings(en)]);
    expect(rowValues(future, 2)).toEqual(["20 February 2025", "Court 72", "Lady Justice Jones", "2:00pm", "CA-2025-002", "C v D", "Judgment", "Reserved"]);
    expect(future?.getCell("A1").font?.bold).toBe(true);
  });

  it("should use Welsh headings and a Welsh formatted date for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatCourtOfAppealCivilDailyCauseListExcel(upload, "cy"));

    // Assert
    const future = workbook.getWorksheet("Notice for future judgments");
    expect(rowValues(workbook.getWorksheet("Daily hearings"), 1)).toEqual(hearingHeadings(cy));
    expect(rowValues(future, 1)).toEqual([cy.tableHeaders.date, ...hearingHeadings(cy)]);
    expect(rowValues(future, 2)[0]).toContain("Chwefror");
  });
});
