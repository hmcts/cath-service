import { createMultiSheetConverter, hasConverterForListTypeName } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { INTERIM_APPLICATIONS_HEARINGS_CONFIG, OPEN_JUSTICE_CONFIG } from "./interim-applications-daily-cause-list-config.js";

const HEARINGS_HEADER = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];
const OPEN_JUSTICE_HEADER = ["Name to be displayed", "Email"];

async function createTwoTabBuffer(hearingRows: unknown[][], openJusticeRows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const hearingsSheet = workbook.addWorksheet("Hearing List");
  for (const row of [HEARINGS_HEADER, ...hearingRows]) {
    hearingsSheet.addRow(row);
  }

  const openJusticeSheet = workbook.addWorksheet("Open Justice Statement Details");
  for (const row of [OPEN_JUSTICE_HEADER, ...openJusticeRows]) {
    openJusticeSheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function convert(buffer: Buffer) {
  return createMultiSheetConverter(buffer, [
    { worksheetName: "Hearing List", worksheetIndex: 0, dataKey: "hearingList", config: INTERIM_APPLICATIONS_HEARINGS_CONFIG },
    { worksheetName: "Open Justice Statement Details", worksheetIndex: 1, dataKey: "openJusticeStatementDetails", config: OPEN_JUSTICE_CONFIG }
  ]);
}

describe("interim applications ChD converter registration", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("INTERIM_APPLICATIONS_DAILY_CAUSE_LIST")).toBe(true);
  });
});

describe("OPEN_JUSTICE_CONFIG", () => {
  it("should map the two open-justice fields as required", () => {
    expect(OPEN_JUSTICE_CONFIG.fields.map((f) => f.fieldName)).toEqual(["nameToBeDisplayed", "email"]);
    for (const field of OPEN_JUSTICE_CONFIG.fields) {
      expect(field.required).toBe(true);
    }
  });

  it("should allow minRows of 0", () => {
    expect(OPEN_JUSTICE_CONFIG.minRows).toBe(0);
  });
});

describe("two-tab conversion", () => {
  it("should convert both tabs into an object with both arrays", async () => {
    const buffer = await createTwoTabBuffer(
      [["Judge A", "10.30am", "This is a venue name", "Case type A", "1234", "This is a case name", "This is additional information"]],
      [["Judge OpenJusticeTest", "Judge.OpenJusticeTest@justice.gov.uk"]]
    );

    const result = await convert(buffer);

    expect(result.hearingList).toHaveLength(1);
    expect(result.hearingList[0]).toEqual({
      judge: "Judge A",
      time: "10.30am",
      venue: "This is a venue name",
      type: "Case type A",
      caseNumber: "1234",
      caseName: "This is a case name",
      additionalInformation: "This is additional information"
    });
    expect(result.openJusticeStatementDetails).toHaveLength(1);
    expect(result.openJusticeStatementDetails[0]).toEqual({
      nameToBeDisplayed: "Judge OpenJusticeTest",
      email: "Judge.OpenJusticeTest@justice.gov.uk"
    });
  });

  it("should return an empty open-justice array when the second tab has no rows", async () => {
    const buffer = await createTwoTabBuffer(
      [["Judge A", "10.30am", "This is a venue name", "Case type A", "1234", "This is a case name", "This is additional information"]],
      []
    );

    const result = await convert(buffer);

    expect(result.hearingList).toHaveLength(1);
    expect(result.openJusticeStatementDetails).toHaveLength(0);
  });

  it("should convert Excel-native time and hyperlink cells as they appear in the real template", async () => {
    // The published template stores Time as an Excel time-typed cell (read back as a
    // 1899 epoch Date) and Email as a mailto hyperlink cell (an object, not a string).
    const workbook = new ExcelJS.Workbook();
    const hearingsSheet = workbook.addWorksheet("Hearing List");
    hearingsSheet.addRow(HEARINGS_HEADER);
    const hearingRow = hearingsSheet.addRow(["Judge A", null, "This is a venue name", "Type A", 1234, "This is a case name", "This is additional information"]);
    hearingRow.getCell(2).value = new Date(Date.UTC(1899, 11, 30, 10, 30, 0));

    const openJusticeSheet = workbook.addWorksheet("Open Justice Statement Details");
    openJusticeSheet.addRow(OPEN_JUSTICE_HEADER);
    const ojRow = openJusticeSheet.addRow(["Judge OpenJusticeTest", null]);
    ojRow.getCell(2).value = { text: "judge.openjusticetest@justice.gov.uk", hyperlink: "mailto:judge.openjusticetest@justice.gov.uk" };

    const result = await convert(Buffer.from(await workbook.xlsx.writeBuffer()));

    expect(result.hearingList[0]).toEqual({
      judge: "Judge A",
      time: "10:30am",
      venue: "This is a venue name",
      type: "Type A",
      caseNumber: "1234",
      caseName: "This is a case name",
      additionalInformation: "This is additional information"
    });
    expect(result.openJusticeStatementDetails[0]).toEqual({
      nameToBeDisplayed: "Judge OpenJusticeTest",
      email: "judge.openjusticetest@justice.gov.uk"
    });
  });

  it("should reject a malformed time in the hearings tab", async () => {
    const buffer = await createTwoTabBuffer(
      [["Judge A", "10:3pm", "This is a venue name", "Case type A", "1234", "This is a case name", "This is additional information"]],
      [["Judge OpenJusticeTest", "Judge.OpenJusticeTest@justice.gov.uk"]]
    );

    await expect(convert(buffer)).rejects.toThrow(/Invalid time format/);
  });

  it("should reject HTML tags in an open-justice field", async () => {
    const buffer = await createTwoTabBuffer(
      [["Judge A", "10.30am", "This is a venue name", "Case type A", "1234", "This is a case name", "This is additional information"]],
      [["<b>Judge OpenJusticeTest</b>", "Judge.OpenJusticeTest@justice.gov.uk"]]
    );

    await expect(convert(buffer)).rejects.toThrow(/HTML tags are not allowed/);
  });

  it("should reject a malformed judge email in the open-justice tab", async () => {
    const buffer = await createTwoTabBuffer(
      [["Judge A", "10.30am", "This is a venue name", "Case type A", "1234", "This is a case name", "This is additional information"]],
      [["Judge OpenJusticeTest", "not-an-email"]]
    );

    await expect(convert(buffer)).rejects.toThrow(/Invalid email format/);
  });
});
