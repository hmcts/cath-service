import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { convertExcelToJson, type ExcelConverterConfig, validateDateFormat, validateNoHtmlTags } from "./excel-to-json.js";

function createExcelBuffer(data: unknown[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("excel-to-json", () => {
  describe("convertExcelToJson", () => {
    it("should convert valid Excel file with simple config", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Age", fieldName: "age", required: true }
        ]
      };

      const excelData = [
        ["Name", "Age"],
        ["John Doe", "30"],
        ["Jane Smith", "25"]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "John Doe", age: "30" });
      expect(result[1]).toEqual({ name: "Jane Smith", age: "25" });
    });

    it("should handle optional fields", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Email", fieldName: "email", required: false }
        ]
      };

      const excelData = [
        ["Name", "Email"],
        ["John Doe", "john@example.com"],
        ["Jane Smith", ""]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "John Doe", email: "john@example.com" });
      expect(result[1]).toEqual({ name: "Jane Smith", email: "" });
    });

    it("should apply validators to fields", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          {
            header: "Content",
            fieldName: "content",
            required: true,
            validators: [(value, rowNumber) => validateNoHtmlTags(value, "Content", rowNumber)]
          }
        ]
      };

      const excelData = [
        ["Name", "Content"],
        ["John", "<script>alert('xss')</script>"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should handle case-insensitive headers", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Age", fieldName: "age", required: true }
        ]
      };

      const excelData = [
        ["NAME", "AGE"],
        ["John Doe", "30"]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: "John Doe", age: "30" });
    });

    it("should trim whitespace from values", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "City", fieldName: "city", required: true }
        ]
      };

      const excelData = [
        ["Name", "City"],
        ["  John Doe  ", "  London  "]
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result[0]).toEqual({ name: "John Doe", city: "London" });
    });

    it("should throw error for missing headers", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Age", fieldName: "age", required: true },
          { header: "Email", fieldName: "email", required: true }
        ]
      };

      const excelData = [
        ["Name", "Age"],
        ["John Doe", "30"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/Excel file must contain columns.*Missing: Email/);
    });

    it("should throw error when file has no data rows", async () => {
      const config: ExcelConverterConfig = {
        fields: [{ header: "Name", fieldName: "name", required: true }],
        minRows: 1
      };

      const excelData = [["Name"]];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow("Excel file must contain at least 1 data row");
    });

    // Note: Testing "no worksheet" scenario is not practical as XLSX.write() itself
    // throws an error when trying to write a workbook with no sheets. In real-world
    // usage, a user cannot upload such a file.

    it("should throw error for missing required field value", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Age", fieldName: "age", required: true }
        ]
      };

      const excelData = [
        ["Name", "Age"],
        ["John Doe", ""],
        ["Jane Smith", "25"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/Error in row 2:.*Missing required field 'Age'/);
    });

    it("should include row number in validation errors", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          {
            header: "Content",
            fieldName: "content",
            required: true,
            validators: [(value, rowNumber) => validateNoHtmlTags(value, "Content", rowNumber)]
          }
        ]
      };

      const excelData = [
        ["Name", "Content"],
        ["John", "Valid content"],
        ["Jane", "Also valid"],
        ["Bob", "<div>Invalid</div>"]
      ];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/Error in row 4/);
    });

    it("should respect minRows configuration", async () => {
      const config: ExcelConverterConfig = {
        fields: [{ header: "Name", fieldName: "name", required: true }],
        minRows: 3
      };

      const excelData = [["Name"], ["John"], ["Jane"]];

      const buffer = createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow("Excel file must contain at least 3 data rows");
    });

    it("should allow minRows of 0 for optional data", async () => {
      const config: ExcelConverterConfig = {
        fields: [{ header: "Name", fieldName: "name", required: true }],
        minRows: 0
      };

      const excelData = [
        ["Name"]
        // No data rows
      ];

      const buffer = createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(0);
    });
  });

  describe("validateNoHtmlTags", () => {
    it("should not throw for text without HTML tags", () => {
      expect(() => validateNoHtmlTags("Plain text", "Field", 1)).not.toThrow();
      expect(() => validateNoHtmlTags("Text with & ampersand", "Field", 1)).not.toThrow();
    });

    it("should throw for text with HTML tags", () => {
      expect(() => validateNoHtmlTags("<div>text</div>", "Field", 1)).toThrow(/HTML tags are not allowed/);
      expect(() => validateNoHtmlTags("<script>alert('xss')</script>", "Field", 2)).toThrow(/HTML tags are not allowed/);
      expect(() => validateNoHtmlTags("Text with <b>bold</b>", "Field", 3)).toThrow(/HTML tags are not allowed/);
    });

    it("should include field name and row number in error", () => {
      expect(() => validateNoHtmlTags("<div>text</div>", "Content Field", 5)).toThrow(/Content Field.*row 5/);
    });
  });

  describe("validateDateFormat", () => {
    it("should validate date format correctly", () => {
      const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
      const validator = validateDateFormat(pattern, "dd/MM/yyyy");

      expect(() => validator("01/01/2025", 1)).not.toThrow();
      expect(() => validator("31/12/2025", 1)).not.toThrow();
    });

    it("should throw for invalid date format", () => {
      const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
      const validator = validateDateFormat(pattern, "dd/MM/yyyy");

      expect(() => validator("2025-01-01", 1)).toThrow(/Invalid date format/);
      expect(() => validator("1/1/2025", 2)).toThrow(/Invalid date format/);
    });

    it("should throw for dates that don't exist in calendar", () => {
      const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
      const validator = validateDateFormat(pattern, "dd/MM/yyyy");

      expect(() => validator("32/01/2025", 1)).toThrow(/Date does not exist in calendar/);
      expect(() => validator("31/02/2025", 2)).toThrow(/Date does not exist in calendar/);
      expect(() => validator("29/02/2025", 3)).toThrow(/Date does not exist in calendar/); // Not a leap year
    });

    it("should accept valid leap year dates", () => {
      const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
      const validator = validateDateFormat(pattern, "dd/MM/yyyy");

      expect(() => validator("29/02/2024", 1)).not.toThrow(); // 2024 is a leap year
    });

    it("should include row number and expected format in error", () => {
      const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
      const validator = validateDateFormat(pattern, "dd/MM/yyyy (e.g., 01/01/2025)");

      expect(() => validator("2025-01-01", 10)).toThrow(/row 10.*Expected format: dd\/MM\/yyyy/);
    });
  });
});
