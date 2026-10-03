import { convertExcelToJson, getConverterForListTypeName, hasConverterForListTypeName } from "@hmcts/list-types-common";
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

  it("should yield an empty array for a missing section tab", async () => {
    const buffer = await createWorkbook([
      { name: SECTIONS[0].worksheetName, rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", "Listed for 1 day"]] }
    ]);

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(buffer)) as unknown as Record<string, unknown[]>;

    expect(result[SECTIONS[0].key]).toHaveLength(1);
    expect(result[SECTIONS[1].key]).toHaveLength(0);
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

  it("should mark all fields as required", () => {
    for (const field of STANDARD_CONFIG.fields) {
      expect(field.required).toBe(true);
    }
  });

  it("should allow empty section sheets with minRows of 0", () => {
    expect(STANDARD_CONFIG.minRows).toBe(0);
  });

  it("should reject an empty additional information cell", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "2pm", "Court 2", "Hearing", "CR-2026-000456", "Beta v Gamma", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Missing required field 'Additional Information'/);
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
