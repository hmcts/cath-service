import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { listTypeData } from "../list-type-data.js";
import { convertExcelForListTypeName, getConverterForListTypeName, hasConverterForListTypeName } from "./non-strategic-list-registry.js";

// Side-effect imports register each non-strategic list type's converter
import "@hmcts/administrative-court-daily-cause-list";
import "@hmcts/ast-daily-hearing-list";
import "@hmcts/business-and-property-division-rolls-building-daily-cause-list";
import "@hmcts/care-standards-tribunal-weekly-hearing-list";
import "@hmcts/cic-weekly-hearing-list";
import "@hmcts/court-of-appeal-civil-daily-cause-list";
import "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import "@hmcts/ftt-rpt-weekly-hearing-list";
import "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import "@hmcts/grc-weekly-hearing-list";
import "@hmcts/interim-applications-daily-cause-list";
import "@hmcts/london-administrative-court-daily-cause-list";
import "@hmcts/pht-weekly-hearing-list";
import "@hmcts/rcj-standard-daily-cause-list";
import "@hmcts/send-daily-hearing-list";
import "@hmcts/siac-poac-paac-weekly-hearing-list";
import "@hmcts/sscs-daily-hearing-list";
import "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import "@hmcts/utiac-jr-daily-hearing-list";
import "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import "@hmcts/wpafcc-weekly-hearing-list";

const CST_NAME = "CST_WEEKLY_HEARING_LIST";
const CST_HEADER = ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"];
// PIP rejects a blank cell only for these fields, because only their schema patterns reject ""
const REQUIRED_FIELD_NAMES = new Set(["date", "time", "hearingTime"]);
const NON_STRATEGIC_LIST_TYPE_NAMES = listTypeData.filter((listType) => listType.isNonStrategic).map((listType) => listType.name);

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  for (const row of data) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("list-type-converters", () => {
  describe("getConverterForListTypeName", () => {
    it("should return converter for Care Standards Tribunal", () => {
      const converter = getConverterForListTypeName(CST_NAME);
      expect(converter).toBeDefined();
      expect(converter?.config).toBeDefined();
      expect(converter?.convertExcelToJson).toBeInstanceOf(Function);
    });

    it("should return undefined for unknown list type", () => {
      const converter = getConverterForListTypeName("UNKNOWN_LIST_TYPE");
      expect(converter).toBeUndefined();
    });
  });

  describe("hasConverterForListTypeName", () => {
    it("should return true for Care Standards Tribunal", () => {
      expect(hasConverterForListTypeName(CST_NAME)).toBe(true);
    });

    it("should return false for unknown list type", () => {
      expect(hasConverterForListTypeName("UNKNOWN_LIST_TYPE")).toBe(false);
    });
  });

  describe("required fields", () => {
    it.each(NON_STRATEGIC_LIST_TYPE_NAMES)("should require a value only for date and time fields in every non-strategic converter (%s)", (listTypeName) => {
      const converter = getConverterForListTypeName(listTypeName);

      const sheetConfigs = converter?.sheets ?? (converter ? [{ config: converter.config }] : []);
      const fields = sheetConfigs.flatMap((sheet) => sheet.config.fields);

      expect(converter).toBeDefined();
      for (const field of fields) {
        expect(field.required, `${listTypeName} ${field.fieldName}`).toBe(REQUIRED_FIELD_NAMES.has(field.fieldName));
      }
    });
  });

  describe("convertExcelForListTypeName", () => {
    it("should convert valid Excel file for CST list", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelForListTypeName(CST_NAME, buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      });
    });

    it("should convert multiple rows for CST list", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"],
        ["03/01/2025", "C Vs D", "Half day", "Preliminary hearing", "Care Standards Office", "In person"]
      ];

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelForListTypeName(CST_NAME, buffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ caseName: "A Vs B" });
      expect(result[1]).toMatchObject({ caseName: "C Vs D" });
    });

    it("should handle headers with different casing", async () => {
      const excelData = [
        ["DATE", "CASE NAME", "HEARING LENGTH", "HEARING TYPE", "VENUE", "ADDITIONAL INFORMATION"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelForListTypeName(CST_NAME, buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ caseName: "A Vs B" });
    });

    it("should trim whitespace from field values", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["  02/01/2025  ", "  A Vs B  ", "  1 hour  ", "  Substantive hearing  ", "  Care Standards Tribunal  ", "  Remote hearing  "]
      ];

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelForListTypeName(CST_NAME, buffer);

      expect(result[0]).toMatchObject({
        caseName: "A Vs B",
        date: "02/01/2025"
      });
    });

    it("should reject Excel file with missing columns", async () => {
      const excelData = [
        ["Date", "Case name"], // Missing required columns
        ["02/01/2025", "A Vs B"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Excel file must contain columns/);
    });

    it("should reject empty Excel file", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"]
        // No data rows
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow("Excel file must contain at least 1 data row");
    });

    it("should reject invalid date format (wrong pattern)", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["2025-01-02", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Invalid date format.*Expected format: dd\/MM\/yyyy/);
    });

    it("should reject date without leading zeros", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["2/1/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Invalid date format/);
    });

    it("should reject invalid dates (e.g., 32/01/2025)", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["32/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Date does not exist in calendar/);
    });

    it("should reject HTML tags in case name", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "<script>alert('xss')</script>A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in hearing type", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "<b>Substantive hearing</b>", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in venue", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "<div>Care Standards Tribunal</div>", "Remote hearing"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in additional information", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "<a href='#'>Remote hearing</a>"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should store blank, whitespace-only and formula-error optional cells as empty strings", async () => {
      const excelData = [CST_HEADER, ["02/01/2025", "", "   ", { error: "#REF!" }, "", "Remote hearing"]];
      const buffer = await createExcelBuffer(excelData);

      const result = await convertExcelForListTypeName(CST_NAME, buffer);

      expect(result).toEqual([{ date: "02/01/2025", caseName: "", hearingLength: "", hearingType: "", venue: "", additionalInformation: "Remote hearing" }]);
    });

    it("should reject a blank date", async () => {
      const excelData = [CST_HEADER, ["", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]];
      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Missing required field 'Date'/);
    });

    it("should include row number in error messages", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"],
        ["invalid-date", "C Vs D", "Half day", "Preliminary hearing", "Care Standards Office", "In person"]
      ];

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelForListTypeName(CST_NAME, buffer)).rejects.toThrow(/Error in row 3/);
    });

    it("should throw error for unknown list type name", async () => {
      const buffer = Buffer.from("dummy");
      await expect(convertExcelForListTypeName("UNKNOWN_LIST_TYPE", buffer)).rejects.toThrow("No converter found for list type name: UNKNOWN_LIST_TYPE");
    });
  });
});
