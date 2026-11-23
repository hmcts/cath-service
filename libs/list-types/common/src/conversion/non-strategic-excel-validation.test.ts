import { SECTIONS } from "@hmcts/business-and-property-division-rolls-building-daily-cause-list";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { type ExcelValidationError, type ExcelValidationIssue, isExcelValidationError } from "./excel-validation-error.js";
import { validateNonStrategicExcel } from "./non-strategic-excel-validation.js";
import { createConverter, registerConverterByName } from "./non-strategic-list-registry.js";

const BPD_LIST_TYPE_NAME = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const NO_SCHEMA_LIST_TYPE_NAME = "TEST_NO_SCHEMA_EXCEL_LIST";
const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];
const VALID_ROW = ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", "Listed for 1 day"];

registerConverterByName(NO_SCHEMA_LIST_TYPE_NAME, createConverter({ fields: [{ header: "Judge", fieldName: "judge", required: true }] }));

async function createWorkbook(sheets: { name: string; rows: unknown[][] }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function bpdTabs(overrides: Record<string, unknown[][]> = {}, omit: string[] = []) {
  return SECTIONS.filter((section) => !omit.includes(section.worksheetName)).map((section) => ({
    name: section.worksheetName,
    rows: overrides[section.worksheetName] ?? [HEADERS, VALID_ROW]
  }));
}

async function captureError(promise: Promise<unknown>): Promise<ExcelValidationError> {
  try {
    await promise;
  } catch (error) {
    if (isExcelValidationError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected validation to fail");
}

function locations(issues: ExcelValidationIssue[]) {
  return issues.map(({ sheetName, rowNumber, columnHeader, reason }) => ({ sheetName, rowNumber, columnHeader, reason }));
}

describe("validateNonStrategicExcel", () => {
  it("should return the converted data for a valid workbook", async () => {
    // Arrange
    const buffer = await createWorkbook(bpdTabs());

    // Act
    const result = (await validateNonStrategicExcel(BPD_LIST_TYPE_NAME, buffer)) as Record<string, unknown[]>;

    // Assert
    expect(Object.keys(result)).toHaveLength(SECTIONS.length);
    expect(result.appealList).toEqual([
      {
        judge: "Mr Justice Smith",
        time: "10am",
        venue: "Court 1",
        type: "Trial",
        caseNumber: "CR-2026-1",
        caseName: "Acme v Widgets",
        additionalInformation: "Listed for 1 day"
      }
    ]);
  });

  it("should report missing tabs through the schema's required list using the tab name", async () => {
    // Arrange
    const buffer = await createWorkbook(bpdTabs({}, ["Insolvency & Companies Court", "Patents Court"]));

    // Act
    const error = await captureError(validateNonStrategicExcel(BPD_LIST_TYPE_NAME, buffer));

    // Assert
    expect(locations(error.issues)).toEqual([
      { sheetName: "Insolvency & Companies Court", rowNumber: undefined, columnHeader: undefined, reason: "Sheet is missing from the file" },
      { sheetName: "Patents Court", rowNumber: undefined, columnHeader: undefined, reason: "Sheet is missing from the file" }
    ]);
  });

  it("should combine converter and schema issues in tab order without duplicating a location", async () => {
    // Arrange - "half ten" fails both the converter and the schema time pattern, so it must be reported once
    const buffer = await createWorkbook(
      bpdTabs({ "Business List": [HEADERS, ["Judge B", "half ten", "Court 2", "Trial", "CR-2", "Case B", "None"]] }, ["Appeal List"])
    );

    // Act
    const error = await captureError(validateNonStrategicExcel(BPD_LIST_TYPE_NAME, buffer));

    // Assert
    expect(locations(error.issues)).toEqual([
      { sheetName: "Appeal List", rowNumber: undefined, columnHeader: undefined, reason: "Sheet is missing from the file" },
      {
        sheetName: "Business List",
        rowNumber: 1,
        columnHeader: "Time",
        reason: "Invalid time format 'half ten'. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)"
      }
    ]);
  });

  it("should give a schema-only error a tab, row and column location with the schema message", async () => {
    // Arrange - the converter allows a space before am/pm but the schema pattern does not
    const buffer = await createWorkbook(
      bpdTabs({ "Commercial Court": [HEADERS, VALID_ROW, ["Judge C", "10 am", "Court 3", "Trial", "CR-3", "Case C", "None"]] })
    );

    // Act
    const error = await captureError(validateNonStrategicExcel(BPD_LIST_TYPE_NAME, buffer));

    // Assert
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toMatchObject({ sheetName: "Commercial Court", sheetKey: "commercialCourt", rowNumber: 2, columnHeader: "Time" });
    expect(error.issues[0].reason).toMatch(/^must match pattern/);
    expect(error.message).toMatch(/^commercialCourt\.1\.time: must match pattern/);
  });

  it("should report only converter issues for a list type with no schema", async () => {
    // Arrange
    const buffer = await createWorkbook([{ name: "Sheet1", rows: [["Judge"], ["Judge A"], [" "], ["Judge C"]] }]);

    // Act
    const error = await captureError(validateNonStrategicExcel(NO_SCHEMA_LIST_TYPE_NAME, buffer));

    // Assert
    expect(locations(error.issues)).toEqual([{ sheetName: undefined, rowNumber: 2, columnHeader: "Judge", reason: "Missing required value" }]);
  });

  it("should return the data for a valid workbook of a list type with no schema", async () => {
    // Arrange
    const buffer = await createWorkbook([{ name: "Sheet1", rows: [["Judge"], ["Judge A"]] }]);

    // Act
    const result = await validateNonStrategicExcel(NO_SCHEMA_LIST_TYPE_NAME, buffer);

    // Assert
    expect(result).toEqual([{ judge: "Judge A" }]);
  });

  it("should rethrow a non-validation conversion error unchanged", async () => {
    // Arrange
    const buffer = await createWorkbook([{ name: "Sheet 1", rows: [HEADERS, VALID_ROW] }]);

    // Act & Assert
    await expect(validateNonStrategicExcel(BPD_LIST_TYPE_NAME, buffer)).rejects.toThrow("Excel file has no recognised worksheet tabs");
  });

  it("should throw when no converter is registered for the list type", async () => {
    // Act & Assert
    await expect(validateNonStrategicExcel("TEST_UNREGISTERED_LIST", Buffer.from(""))).rejects.toThrow(
      "No converter found for list type name: TEST_UNREGISTERED_LIST"
    );
  });
});
