import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  convertExcelToJson,
  type ExcelConverterConfig,
  type FieldConfig,
  findFieldForHeader,
  readCellValue,
  validateDateFormat,
  validateNoHtmlTags
} from "./excel-to-json.js";

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  for (const row of data) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
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

      const buffer = await createExcelBuffer(excelData);
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

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "John Doe", email: "john@example.com" });
      expect(result[1]).toEqual({ name: "Jane Smith", email: "" });
    });

    it("should treat optional fields as empty string when the column is absent from a row", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Notes", fieldName: "notes", required: false }
        ]
      };

      // ExcelJS omits trailing empty cells, so "Notes" won't appear in the row data
      const excelData = [
        ["Name", "Notes"],
        ["John Doe"] // no Notes cell
      ];

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: "John Doe", notes: "" });
    });

    it("should throw when a required column is missing from the header row", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Notes", fieldName: "notes", required: false }
        ]
      };

      const excelData = [
        ["Notes"], // header row missing "Name"
        ["some note"]
      ];

      const buffer = await createExcelBuffer(excelData);
      await expect(convertExcelToJson(buffer, config)).rejects.toThrow("Missing: Name");
    });

    it("should throw missing required field error when a required cell is empty in a row", async () => {
      const config: ExcelConverterConfig = {
        fields: [
          { header: "Name", fieldName: "name", required: true },
          { header: "Notes", fieldName: "notes", required: false }
        ]
      };

      // A row with only Notes filled — Name (required) is absent because ExcelJS omits empty leading/middle cells
      // We simulate this by passing undefined for the Name cell position
      const excelData = [
        ["Name", "Notes"],
        [undefined, "some note"]
      ];

      const buffer = await createExcelBuffer(excelData);
      await expect(convertExcelToJson(buffer, config)).rejects.toThrow("Missing required field 'Name' in row 2");
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

      const buffer = await createExcelBuffer(excelData);

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

      const buffer = await createExcelBuffer(excelData);
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

      const buffer = await createExcelBuffer(excelData);
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

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/Excel file must contain columns.*Missing: Email/);
    });

    it("should throw error when file has no data rows", async () => {
      const config: ExcelConverterConfig = {
        fields: [{ header: "Name", fieldName: "name", required: true }],
        minRows: 1
      };

      const excelData = [["Name"]];

      const buffer = await createExcelBuffer(excelData);

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

      const buffer = await createExcelBuffer(excelData);

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

      const buffer = await createExcelBuffer(excelData);

      await expect(convertExcelToJson(buffer, config)).rejects.toThrow(/Error in row 4/);
    });

    it("should respect minRows configuration", async () => {
      const config: ExcelConverterConfig = {
        fields: [{ header: "Name", fieldName: "name", required: true }],
        minRows: 3
      };

      const excelData = [["Name"], ["John"], ["Jane"]];

      const buffer = await createExcelBuffer(excelData);

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

      const buffer = await createExcelBuffer(excelData);
      const result = await convertExcelToJson(buffer, config);

      expect(result).toHaveLength(0);
    });
  });

  describe("convertExcelToJson with typed cells", () => {
    const fields: FieldConfig[] = [
      { header: "Venue", fieldName: "venue" },
      { header: "Case Details", fieldName: "caseDetails" },
      { header: "Notes", fieldName: "notes", required: false }
    ];

    it("should convert rich text, hyperlink and formula cells to their readable text", async () => {
      // Arrange
      const buffer = await createExcelBuffer([
        ["Venue", "Case Details", "Notes"],
        [{ text: "Court 1", hyperlink: "https://example.com" }, { richText: [{ text: "Smith " }, { text: "v Jones" }] }, { formula: "1+1", result: 2 }]
      ]);

      // Act
      const result = await convertExcelToJson(buffer, { fields });

      // Assert
      expect(result).toEqual([{ venue: "Court 1", caseDetails: "Smith v Jones", notes: "2" }]);
    });

    it("should fail the upload when a required field holds an error value", async () => {
      // Arrange
      const buffer = await createExcelBuffer([
        ["Venue", "Case Details", "Notes"],
        ["Court 1", { formula: "A1/0", result: { error: "#DIV/0!" } }, ""]
      ]);

      // Act
      const result = convertExcelToJson(buffer, { fields });

      // Assert
      await expect(result).rejects.toThrow("Missing required field 'Case Details' in row 2");
    });

    it("should recognise a rich text header", async () => {
      // Arrange
      const buffer = await createExcelBuffer([
        ["Venue", { richText: [{ font: { bold: true }, text: "Case " }, { text: "Details" }] }, "Notes"],
        ["Court 1", "Smith v Jones", ""]
      ]);

      // Act
      const result = await convertExcelToJson(buffer, { fields });

      // Assert
      expect(result).toEqual([{ venue: "Court 1", caseDetails: "Smith v Jones", notes: "" }]);
    });

    it("should not shift later fields when a header cell is blank", async () => {
      // Arrange
      const buffer = await createExcelBuffer([
        ["Venue", null, "Case Details", "Notes"],
        ["Court 1", "ignored", "Smith v Jones", "Bring bundle"]
      ]);

      // Act
      const result = await convertExcelToJson(buffer, { fields });

      // Assert
      expect(result).toEqual([{ venue: "Court 1", caseDetails: "Smith v Jones", notes: "Bring bundle" }]);
    });
  });

  describe("readCellValue", () => {
    it("should return an empty string when the value is null or undefined", () => {
      // Act
      const results = [readCellValue(null), readCellValue(undefined)];

      // Assert
      expect(results).toEqual(["", ""]);
    });

    it("should trim string values", () => {
      // Act
      const result = readCellValue("  Court 1  ");

      // Assert
      expect(result).toBe("Court 1");
    });

    it("should stringify numeric values", () => {
      // Act
      const result = readCellValue(10.3);

      // Assert
      expect(result).toBe("10.3");
    });

    it("should format Date values as dd/MM/yyyy", () => {
      // Act
      const result = readCellValue(new Date(2025, 0, 5));

      // Assert
      expect(result).toBe("05/01/2025");
    });

    it("should stringify invalid Date values without formatting", () => {
      // Arrange
      const invalidDate = new Date("not a date");

      // Act
      const result = readCellValue(invalidDate);

      // Assert
      expect(result).toBe("Invalid Date");
    });

    it("should join the text parts of a rich text value", () => {
      // Arrange
      const value = { richText: [{ text: "Smith " }, { font: { bold: true }, text: "v Jones" }] };

      // Act
      const result = readCellValue(value);

      // Assert
      expect(result).toBe("Smith v Jones");
    });

    it("should read the text of a hyperlink value", () => {
      // Arrange
      const value = { text: " Court 1 ", hyperlink: "https://example.com" };

      // Act
      const result = readCellValue(value);

      // Assert
      expect(result).toBe("Court 1");
    });

    it("should read the text of a hyperlink whose text is rich text", () => {
      // Arrange
      const value = { text: { richText: [{ text: "Court " }, { text: "2" }] }, hyperlink: "https://example.com" };

      // Act
      const result = readCellValue(value);

      // Assert
      expect(result).toBe("Court 2");
    });

    it("should read the cached result of a formula", () => {
      // Arrange
      const value = { formula: "A1&B1", result: "Court 3" };

      // Act
      const result = readCellValue(value);

      // Assert
      expect(result).toBe("Court 3");
    });

    it("should read the cached result of a shared formula", () => {
      // Arrange
      const value = { sharedFormula: "C2", result: 42 };

      // Act
      const result = readCellValue(value);

      // Assert
      expect(result).toBe("42");
    });

    it("should return an empty string for a formula without a cached result", () => {
      // Act
      const result = readCellValue({ formula: "A1" });

      // Assert
      expect(result).toBe("");
    });

    it("should return an empty string for an error value", () => {
      // Act
      const results = [readCellValue({ error: "#N/A" }), readCellValue({ formula: "1/0", result: { error: "#DIV/0!" } })];

      // Assert
      expect(results).toEqual(["", ""]);
    });

    it("should return an empty string for an unknown object value", () => {
      // Act
      const result = readCellValue({ unexpected: true });

      // Assert
      expect(result).toBe("");
    });
  });

  describe("findFieldForHeader", () => {
    const fields: FieldConfig[] = [
      { header: "Case Number", fieldName: "caseNumber" },
      { header: "Venue", fieldName: "venue" }
    ];

    it("should match a header case-insensitively", () => {
      // Act
      const result = findFieldForHeader(fields, "CASE NUMBER");

      // Assert
      expect(result?.fieldName).toBe("caseNumber");
    });

    it("should ignore surrounding whitespace in the header", () => {
      // Act
      const result = findFieldForHeader(fields, "  venue ");

      // Assert
      expect(result?.fieldName).toBe("venue");
    });

    it("should return undefined for an unknown header", () => {
      // Act
      const result = findFieldForHeader(fields, "Notes");

      // Assert
      expect(result).toBeUndefined();
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
