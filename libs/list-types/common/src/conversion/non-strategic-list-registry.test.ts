import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { convertExcelForListType, getConverterForListType, hasConverterForListType } from "./non-strategic-list-registry.js";

// Import CST module to register its converter
import "@hmcts/care-standards-tribunal-weekly-hearing-list";

function createExcelBuffer(data: unknown[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("list-type-converters", () => {
  describe("getConverterForListType", () => {
    it("should return converter for Care Standards Tribunal (listTypeId 9)", () => {
      const converter = getConverterForListType(9);
      expect(converter).toBeDefined();
      expect(converter?.config).toBeDefined();
      expect(converter?.convertExcelToJson).toBeInstanceOf(Function);
    });

    it("should return undefined for unknown list type", () => {
      const converter = getConverterForListType(999);
      expect(converter).toBeUndefined();
    });
  });

  describe("hasConverterForListType", () => {
    it("should return true for Care Standards Tribunal (listTypeId 9)", () => {
      expect(hasConverterForListType(9)).toBe(true);
    });

    it("should return false for unknown list type", () => {
      expect(hasConverterForListType(999)).toBe(false);
    });
  });

  describe("convertExcelForListType", () => {
    it("should convert valid Excel file for CST list", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelForListType(9, buffer);

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

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelForListType(9, buffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ caseName: "A Vs B" });
      expect(result[1]).toMatchObject({ caseName: "C Vs D" });
    });

    it("should handle headers with different casing", async () => {
      const excelData = [
        ["DATE", "CASE NAME", "HEARING LENGTH", "HEARING TYPE", "VENUE", "ADDITIONAL INFORMATION"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelForListType(9, buffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ caseName: "A Vs B" });
    });

    it("should trim whitespace from field values", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["  02/01/2025  ", "  A Vs B  ", "  1 hour  ", "  Substantive hearing  ", "  Care Standards Tribunal  ", "  Remote hearing  "]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelForListType(9, buffer);

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

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Excel file must contain columns/);
    });

    it("should reject empty Excel file", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"]
        // No data rows
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow("Excel file must contain at least 1 data row");
    });

    it("should reject invalid date format (wrong pattern)", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["2025-01-02", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Invalid date format.*Expected format: dd\/MM\/yyyy/);
    });

    it("should reject date without leading zeros", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["2/1/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Invalid date format/);
    });

    it("should reject invalid dates (e.g., 32/01/2025)", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["32/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Date does not exist in calendar/);
    });

    it("should reject HTML tags in case name", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "<script>alert('xss')</script>A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in hearing type", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "<b>Substantive hearing</b>", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in venue", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "<div>Care Standards Tribunal</div>", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in additional information", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "<a href='#'>Remote hearing</a>"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject empty required fields", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Missing required field 'Case name'/);
    });

    it("should include row number in error messages", async () => {
      const excelData = [
        ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
        ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"],
        ["invalid-date", "C Vs D", "Half day", "Preliminary hearing", "Care Standards Office", "In person"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelForListType(9, buffer)).rejects.toThrow(/Error in row 3/);
    });

    it("should throw error for unknown list type", async () => {
      const buffer = Buffer.from("dummy");
      await expect(convertExcelForListType(999, buffer)).rejects.toThrow("No converter found for list type ID: 999");
    });
  });
});
