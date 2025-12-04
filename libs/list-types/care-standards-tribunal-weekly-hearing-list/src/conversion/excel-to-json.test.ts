import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { convertExcelToJson } from "./excel-to-json.js";

function createExcelBuffer(data: unknown[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("convertExcelToJson", () => {
  it("should convert valid Excel file to JSON", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);
    const result = await convertExcelToJson(buffer);

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

  it("should convert multiple rows", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"],
      ["03/01/2025", "C Vs D", "Half day", "Preliminary hearing", "Care Standards Office", "In person"]
    ];

    const buffer = createExcelBuffer(excelData);
    const result = await convertExcelToJson(buffer);

    expect(result).toHaveLength(2);
    expect(result[0].caseName).toBe("A Vs B");
    expect(result[1].caseName).toBe("C Vs D");
  });

  it("should handle headers with different casing", async () => {
    const excelData = [
      ["DATE", "CASE NAME", "HEARING LENGTH", "HEARING TYPE", "VENUE", "ADDITIONAL INFORMATION"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);
    const result = await convertExcelToJson(buffer);

    expect(result).toHaveLength(1);
    expect(result[0].caseName).toBe("A Vs B");
  });

  it("should trim whitespace from field values", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["  02/01/2025  ", "  A Vs B  ", "  1 hour  ", "  Substantive hearing  ", "  Care Standards Tribunal  ", "  Remote hearing  "]
    ];

    const buffer = createExcelBuffer(excelData);
    const result = await convertExcelToJson(buffer);

    expect(result[0].caseName).toBe("A Vs B");
    expect(result[0].date).toBe("02/01/2025");
  });

  it("should reject Excel file with missing columns", async () => {
    const excelData = [
      ["Date", "Case name"], // Missing required columns
      ["02/01/2025", "A Vs B"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/Excel file must contain columns/);
  });

  it("should reject empty Excel file", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"]
      // No data rows
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow("Excel file must contain at least 1 data row");
  });

  it("should reject invalid date format (wrong pattern)", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["2025-01-02", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/Invalid date format.*Expected format: dd\/MM\/yyyy/);
  });

  it("should reject date without leading zeros", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["2/1/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/Invalid date format.*Expected format: dd\/MM\/yyyy/);
  });

  it("should reject invalid dates (e.g., 32/01/2025)", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["32/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/Invalid date.*Date does not exist in calendar/);
  });

  it("should reject HTML tags in case name", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "<script>alert('xss')</script>", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/HTML tags are not allowed/);
  });

  it("should reject HTML tags in hearing type", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "<b>Substantive</b>", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/HTML tags are not allowed/);
  });

  it("should reject HTML tags in venue", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "<p>Care Standards Tribunal</p>", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/HTML tags are not allowed/);
  });

  it("should reject HTML tags in additional information", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "<div>Remote hearing</div>"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/HTML tags are not allowed/);
  });

  it("should reject empty required fields", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/Missing required field 'Case name'/);
  });

  it("should include row number in error messages", async () => {
    const excelData = [
      ["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"],
      ["02/01/2025", "A Vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"],
      ["invalid-date", "C Vs D", "Half day", "Preliminary hearing", "Care Standards Office", "In person"]
    ];

    const buffer = createExcelBuffer(excelData);

    await expect(convertExcelToJson(buffer)).rejects.toThrow(/row 3/);
  });
});
