import {
  convertExcelToJson,
  type ExcelValidationError,
  getConverterForListTypeName,
  hasConverterForListTypeName,
  isExcelValidationError,
  validateNonStrategicExcel
} from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "../sections.js";
import { validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList } from "../validation/json-validator.js";
import { STANDARD_CONFIG } from "./business-and-property-division-rolls-building-daily-cause-list-config.js";
import "./business-and-property-division-rolls-building-daily-cause-list-config.js";

const LIST_TYPE_NAME = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];

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

describe("Business and Property Division Rolls Building converter registration", () => {
  it("should register a converter under the stable list type name", () => {
    expect(hasConverterForListTypeName(LIST_TYPE_NAME)).toBe(true);
  });

  it("should convert a 16-tab workbook into a section-keyed object", async () => {
    const buffer = await createWorkbook(
      SECTIONS.map((section, index) => ({
        name: section.worksheetName,
        rows: [HEADERS, ["Mr Justice Smith", "10am", `Court ${index + 1}`, "Trial", `CR-2026-${index}`, `Case ${section.key}`, "Listed for 1 day"]]
      }))
    );

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(buffer)) as unknown as Record<string, unknown[]>;

    for (const section of SECTIONS) {
      expect(result[section.key]).toHaveLength(1);
      expect((result[section.key][0] as { caseName: string }).caseName).toBe(`Case ${section.key}`);
    }
  });

  it("should leave out a missing section tab so the schema can report it", async () => {
    const buffer = await createWorkbook([
      { name: SECTIONS[0].worksheetName, rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", "Listed for 1 day"]] }
    ]);

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(buffer)) as unknown as Record<string, unknown[]>;

    expect(result[SECTIONS[0].key]).toHaveLength(1);
    expect(result).not.toHaveProperty(SECTIONS[1].key);
  });

  it("should reject a workbook whose only tab matches no section name instead of filing it into Appeal List", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet 1", rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", ""]] }
    ]);

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);

    await expect(converter?.convertExcelToJson(buffer)).rejects.toThrow("Excel file has no recognised worksheet tabs");
  });
});

describe("STANDARD_CONFIG", () => {
  it("should have the 7 ChD/KB fields in order", () => {
    expect(STANDARD_CONFIG.fields).toHaveLength(7);
    expect(STANDARD_CONFIG.fields.map((f) => f.fieldName)).toEqual(["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"]);
  });

  it("should require only the time field, matching PIP", () => {
    const requiredFields = STANDARD_CONFIG.fields.filter((field) => field.required).map((field) => field.fieldName);

    expect(requiredFields).toEqual(["time"]);
  });

  it("should allow empty section sheets with minRows of 0", () => {
    expect(STANDARD_CONFIG.minRows).toBe(0);
  });

  it("should accept an empty additional information cell", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "2pm", "Court 2", "Hearing", "CR-2026-000456", "Beta v Gamma", ""]] }
    ]);

    const result = await convertExcelToJson(buffer, STANDARD_CONFIG);

    expect(result).toEqual([
      {
        judge: "Mr Justice Smith",
        time: "2pm",
        venue: "Court 2",
        type: "Hearing",
        caseNumber: "CR-2026-000456",
        caseName: "Beta v Gamma",
        additionalInformation: ""
      }
    ]);
  });

  it("should accept a row where every column except time is empty", async () => {
    const buffer = await createWorkbook([{ name: "Sheet1", rows: [HEADERS, ["", "2pm", "", "", "", "", ""]] }]);

    const result = await convertExcelToJson(buffer, STANDARD_CONFIG);

    expect(result).toEqual([{ judge: "", time: "2pm", venue: "", type: "", caseNumber: "", caseName: "", additionalInformation: "" }]);
  });

  it("should reject an empty time cell", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "", "Court 2", "Hearing", "CR-2026-000456", "Beta v Gamma", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Missing required field 'Time'/);
  });

  it("should reject an invalid time format", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "14:30", "Court 1", "Trial", "CR-2026-000123", "Acme v Widgets", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Invalid time format/);
  });

  it("should reject HTML tags in the case name field", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-000123", "<script>alert('x')</script>", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
  });
});

// Exercises the converter against a workbook whose tab names are the REAL source-workbook tabs
// (with "&", e.g. "IP & Enterprise Court"), hardcoded here rather than derived from SECTIONS. That
// independence is the point: if a section's worksheetName drifts from the real tab name, the
// converter won't find the tab and the mapped section resolves empty — which these tests catch.
describe("real source workbook tab names", () => {
  // The real tabs and the section key each maps to. Names are the literal source-workbook tabs.
  const REAL_TABS: { name: string; key: string; populated: boolean }[] = [
    { name: "Appeal List", key: "appealList", populated: true },
    { name: "Business List", key: "businessList", populated: true },
    { name: "Commercial Court", key: "commercialCourt", populated: true },
    { name: "Financial List", key: "financialList", populated: true },
    { name: "Insolvency & Companies Court", key: "insolvency&CompaniesCourt", populated: true },
    { name: "IP & Enterprise Court", key: "ip&EnterpriseCourt", populated: false },
    { name: "Intellectual Property List", key: "intellectualPropertyList", populated: true },
    { name: "London Circuit Commercial Court", key: "londonCircuitCommercialCourt", populated: true },
    { name: "Patents Court", key: "patentsCourt", populated: true },
    { name: "Property, Trusts & Probate List", key: "property,Trusts&ProbateList", populated: true },
    { name: "Technology & Construction Court", key: "technology&ConstructionCourt", populated: true },
    { name: "Admiralty Court", key: "admiraltyCourt", populated: true },
    { name: "Companies Winding Up", key: "companiesWindingUp", populated: true },
    { name: "Competition List", key: "competitionList", populated: true },
    { name: "Pensions List", key: "pensionsList", populated: true },
    { name: "Revenue List", key: "revenueList", populated: false }
  ];

  const dataRow = ["Mr Justice Smith", "10:30am", "Court 1", "Trial", "1234", "This is case name", "This is additional information"];

  async function createRealWorkbook(): Promise<Buffer> {
    return createWorkbook(REAL_TABS.map((tab) => ({ name: tab.name, rows: tab.populated ? [HEADERS, dataRow] : [HEADERS] })));
  }

  it("should map every real ampersand-named tab to its section", async () => {
    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(await createRealWorkbook())) as unknown as Record<string, unknown[]>;

    expect(Object.keys(result)).toEqual(SECTIONS.map((s) => s.key));
    for (const tab of REAL_TABS.filter((t) => t.name.includes("&") && t.populated)) {
      expect(result[tab.key].length).toBeGreaterThan(0);
    }
  });

  it("should produce JSON that validates against the schema", async () => {
    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = await converter?.convertExcelToJson(await createRealWorkbook());

    const validation = validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList(result);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

describe("Business and Property Division Rolls Building located errors", () => {
  const VALID_ROW = ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", "Listed for 1 day"];

  function allTabs(overrides: Record<string, unknown[][]> = {}, omit: string[] = []) {
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
    throw new Error("Expected the upload to fail validation");
  }

  it("should report errors in Appeal List and Insolvency & Companies Court by tab name", async () => {
    // Arrange
    const buffer = await createWorkbook(
      allTabs({
        "Appeal List": [HEADERS, VALID_ROW, ["Mr Justice Smith", "", "Court 2", "Trial", "CR-2026-2", "Case B", "None"]],
        "Insolvency & Companies Court": [HEADERS, ["ICC Judge Green", "half ten", "Court 7", "Winding up", "CR-2026-3", "Re Example Ltd", "Hybrid"]]
      })
    );

    // Act
    const error = await captureError(getConverterForListTypeName(LIST_TYPE_NAME)!.convertExcelToJson(buffer));

    // Assert
    expect(error.issues.map(({ sheetName, rowNumber, columnHeader, reason }) => ({ sheetName, rowNumber, columnHeader, reason }))).toEqual([
      { sheetName: "Appeal List", rowNumber: 2, columnHeader: "Time", reason: "Missing required value" },
      {
        sheetName: "Insolvency & Companies Court",
        rowNumber: 1,
        columnHeader: "Time",
        reason: "Invalid time format 'half ten'. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)"
      }
    ]);
  });

  it("should report each missing tab together with the cell errors", async () => {
    // Arrange
    const buffer = await createWorkbook(
      allTabs({ "Appeal List": [HEADERS, ["Mr Justice Smith", "", "Court 1", "Trial", "CR-2026-1", "Case A", "None"]] }, ["Patents Court", "Revenue List"])
    );

    // Act
    const error = await captureError(validateNonStrategicExcel(LIST_TYPE_NAME, buffer));

    // Assert
    expect(error.issues.map(({ sheetName, rowNumber, columnHeader, reason }) => ({ sheetName, rowNumber, columnHeader, reason }))).toEqual([
      { sheetName: "Appeal List", rowNumber: 1, columnHeader: "Time", reason: "Missing required value" },
      { sheetName: "Patents Court", rowNumber: undefined, columnHeader: undefined, reason: "Sheet is missing from the file" },
      { sheetName: "Revenue List", rowNumber: undefined, columnHeader: undefined, reason: "Sheet is missing from the file" }
    ]);
  });

  it("should accept tabs whose name differs from the template only in case or spacing, as PIP does", async () => {
    // Arrange
    const tabs = allTabs().map((tab) =>
      tab.name === "Commercial Court" ? { ...tab, name: "commercial  court " } : tab.name === "Revenue List" ? { ...tab, name: "REVENUE LIST" } : tab
    );
    const buffer = await createWorkbook(tabs);

    // Act
    const result = (await validateNonStrategicExcel(LIST_TYPE_NAME, buffer)) as Record<string, unknown[]>;

    // Assert
    expect(result.commercialCourt).toHaveLength(1);
    expect(result.revenueList).toHaveLength(1);
  });

  it("should accept a workbook with every tab present when some hold only the header row", async () => {
    // Arrange
    const buffer = await createWorkbook(allTabs({ "Business List": [HEADERS], "Pensions List": [HEADERS] }));

    // Act
    const result = (await validateNonStrategicExcel(LIST_TYPE_NAME, buffer)) as Record<string, unknown[]>;

    // Assert
    expect(result.businessList).toEqual([]);
    expect(result.pensionsList).toEqual([]);
    expect(result.appealList).toHaveLength(1);
  });
});
