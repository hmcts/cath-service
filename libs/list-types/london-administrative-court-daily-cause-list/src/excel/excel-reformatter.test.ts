import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { reformatLondonAdministrativeCourtDailyCauseListExcel } from "./excel-reformatter.js";

const UPLOADED_HEADER = ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"];

async function buildUpload(sheets: Record<string, unknown[][]>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
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
  const h = t.tableHeaders;
  return [h.venue, h.judge, h.time, h.caseNumber, h.caseDetails, h.hearingType, h.additionalInformation];
}

describe("reformatLondonAdministrativeCourtDailyCauseListExcel", () => {
  it("should reformat both the main hearings and planning court sheets", async () => {
    // Arrange
    const upload = await buildUpload({
      "Main hearings": [UPLOADED_HEADER, ["Court 1", "Judge A", "10.30am", "AC-1", "R v A", "Hearing", ""]],
      "Planning Court": [UPLOADED_HEADER, ["Court 2", "Judge B", "2.15pm", "PC-1", "R v B", "Review", "Remote"]]
    });

    // Act
    const workbook = await load(await reformatLondonAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    const main = workbook.getWorksheet("Main hearings");
    const planning = workbook.getWorksheet("Planning Court");
    expect(rowValues(main, 1)).toEqual(headings(en));
    expect(rowValues(main, 2)).toEqual(["Court 1", "Judge A", "10:30am", "AC-1", "R v A", "Hearing", ""]);
    expect(rowValues(planning, 1)).toEqual(headings(en));
    expect(rowValues(planning, 2)).toEqual(["Court 2", "Judge B", "2:15pm", "PC-1", "R v B", "Review", "Remote"]);
    expect(planning?.getCell("A1").font?.bold).toBe(true);
  });

  it("should write Welsh headings for the cy locale", async () => {
    // Arrange
    const upload = await buildUpload({
      "Main hearings": [UPLOADED_HEADER, ["Court 1", "Judge A", "10am", "AC-1", "R v A", "Hearing", ""]],
      "Planning Court": [UPLOADED_HEADER, ["Court 2", "Judge B", "2pm", "PC-1", "R v B", "Review", ""]]
    });

    // Act
    const workbook = await load(await reformatLondonAdministrativeCourtDailyCauseListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.getWorksheet("Main hearings"), 1)).toEqual(headings(cy));
    expect(rowValues(workbook.getWorksheet("Planning Court"), 1)).toEqual(headings(cy));
  });

  it("should reformat a workbook that only has the main hearings sheet", async () => {
    // Arrange
    const upload = await buildUpload({ "Main hearings": [UPLOADED_HEADER, ["Court 1", "Judge A", "9.45am", "AC-1", "R v A", "Hearing", ""]] });

    // Act
    const workbook = await load(await reformatLondonAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    expect(workbook.worksheets).toHaveLength(1);
    expect(rowValues(workbook.getWorksheet("Main hearings"), 2)[2]).toBe("9:45am");
  });

  it("should fall back to sheet positions when the sheet names differ", async () => {
    // Arrange
    const upload = await buildUpload({
      Sheet1: [UPLOADED_HEADER, ["Court 1", "Judge A", "10.30am", "AC-1", "R v A", "Hearing", ""]],
      Sheet2: [UPLOADED_HEADER, ["Court 2", "Judge B", "11.00am", "PC-1", "R v B", "Review", ""]]
    });

    // Act
    const workbook = await load(await reformatLondonAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    expect(rowValues(workbook.getWorksheet("Sheet1"), 2)[2]).toBe("10:30am");
    expect(rowValues(workbook.getWorksheet("Sheet2"), 2)[2]).toBe("11:00am");
  });
});
