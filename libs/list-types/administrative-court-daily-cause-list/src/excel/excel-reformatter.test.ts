import { convertExcelForListTypeName } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import "../conversion/administrative-court-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { renderAdminCourt } from "../rendering/renderer.js";
import { reformatAdministrativeCourtDailyCauseListExcel } from "./excel-reformatter.js";

const LIST_TYPE_NAMES = [
  "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
] as const;
const SHEET_NAME = "Birmingham hearings";
const FIELD_ORDER = ["venue", "judge", "time", "caseNumber", "caseDetails", "hearingType", "additionalInformation"] as const;
const UPLOADED_HEADER = ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information", "Internal notes"];
const HEARING_ROWS = [
  ["Court 1", "Mr Justice Smith", "10.30am", "AC-2025-001", "R (Smith) v Secretary of State", "Judicial Review", "Remote", "Vulnerable party"],
  ["Court 2", "Mrs Justice Jones", "2pm", "AC-2025-002", "R (Brown) v Birmingham City Council", "Permission", "", "Do not publish"]
];

async function buildUpload(rows: unknown[][] = HEARING_ROWS): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hearings = workbook.addWorksheet(SHEET_NAME);
  for (const row of [UPLOADED_HEADER, ...rows]) {
    hearings.addRow(row);
  }
  const workingCopy = workbook.addWorksheet("Working copy");
  workingCopy.addRow(UPLOADED_HEADER);
  workingCopy.addRow(["Draft court", "Draft judge", "9am", "DRAFT-1", "Draft", "Draft", "Draft", "Draft"]);
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
  return FIELD_ORDER.map((field) => t.common.tableHeaders[field]);
}

describe("reformatAdministrativeCourtDailyCauseListExcel", () => {
  it("should write the English PDF table headings in bold", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "en"));

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
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "cy"));

    // Assert
    expect(rowValues(workbook.worksheets[0], 1)).toEqual([
      "Lleoliad",
      "Barnwr",
      "Amser",
      "Rhif yr achos",
      "Manylion yr achos",
      "Math o wrandawiad",
      "Gwybodaeth ychwanegol"
    ]);
    expect(rowValues(workbook.worksheets[0], 1)).toEqual(headings(cy));
  });

  it.each(["en", "cy"])("should write the same rows as the PDF for the %s locale", async (locale) => {
    // Arrange
    const upload = await buildUpload();
    const converted = (await convertExcelForListTypeName(LIST_TYPE_NAMES[0], upload)) as unknown as AdministrativeCourtHearingList;
    const { hearings } = renderAdminCourt(converted, {
      locale,
      listTypeName: LIST_TYPE_NAMES[0],
      listTitle: en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
      contentDate: new Date("2025-01-01T00:00:00Z"),
      lastReceivedDate: "2025-01-01T09:55:00Z"
    });

    // Act
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, locale));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(hearings).toHaveLength(HEARING_ROWS.length);
    expect(worksheet.actualRowCount - 1).toBe(hearings.length);
    hearings.forEach((hearing, index) => {
      expect(rowValues(worksheet, index + 2)).toEqual(FIELD_ORDER.map((field) => hearing[field]));
    });
  });

  it("should normalise the time and write empty additional information as an empty cell", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(rowValues(worksheet, 2)).toEqual([
      "Court 1",
      "Mr Justice Smith",
      "10:30am",
      "AC-2025-001",
      "R (Smith) v Secretary of State",
      "Judicial Review",
      "Remote"
    ]);
    expect(rowValues(worksheet, 3)).toEqual(["Court 2", "Mrs Justice Jones", "2pm", "AC-2025-002", "R (Brown) v Birmingham City Council", "Permission", ""]);
  });

  it("should drop the Internal notes column and the second sheet but keep the sheet name and freeze the header row", async () => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    const worksheet = workbook.worksheets[0];
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([SHEET_NAME]);
    expect(worksheet.columnCount).toBe(FIELD_ORDER.length);
    expect([...rowValues(worksheet, 1), ...rowValues(worksheet, 2), ...rowValues(worksheet, 3)]).not.toContain("Internal notes");
    expect([...rowValues(worksheet, 2), ...rowValues(worksheet, 3)]).not.toContain("Vulnerable party");
    expect(worksheet.views[0]).toEqual(expect.objectContaining({ state: "frozen", ySplit: 1 }));
  });

  it("should escape a value that would run as a formula", async () => {
    // Arrange
    const upload = await buildUpload([["Court 1", "Mr Justice Smith", "10am", "AC-2025-003", '=HYPERLINK("http://example.com")', "Trial", "", ""]]);

    // Act
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    expect(workbook.worksheets[0].getCell("E2").value).toBe('\'=HYPERLINK("http://example.com")');
  });

  it.each(LIST_TYPE_NAMES)("should convert and reformat the same upload for %s", async (listTypeName) => {
    // Arrange
    const upload = await buildUpload();

    // Act
    const converted = await convertExcelForListTypeName(listTypeName, upload);
    const workbook = await load(await reformatAdministrativeCourtDailyCauseListExcel(upload, "en"));

    // Assert
    expect(converted).toHaveLength(HEARING_ROWS.length);
    expect(rowValues(workbook.worksheets[0], 1)).toEqual(headings(en));
    expect(workbook.worksheets[0].actualRowCount).toBe(HEARING_ROWS.length + 1);
  });
});
