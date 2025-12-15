import { describe, expect, it } from "vitest";
import * as ExcelJS from "exceljs";

// Test the Excel helper functions we created for E2E tests
describe("Excel Helper Functions", () => {
  async function createValidCSTExcel(): Promise<Buffer> {
    const hearings = [
      {
        Date: "01/01/2026",
        "Case name": "Test Case A vs B",
        "Hearing length": "1 hour",
        "Hearing type": "Substantive hearing",
        Venue: "Care Standards Tribunal",
        "Additional information": "Remote hearing via video"
      },
      {
        Date: "02/01/2026",
        "Case name": "Another Case C vs D",
        "Hearing length": "Half day",
        "Hearing type": "Preliminary hearing",
        Venue: "Care Standards Tribunal",
        "Additional information": "In person"
      },
      {
        Date: "03/01/2026",
        "Case name": "Final Case E vs F",
        "Hearing length": "Full day",
        "Hearing type": "Final hearing",
        Venue: "Care Standards Tribunal",
        "Additional information": "Hybrid hearing"
      }
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Hearings");

    worksheet.columns = [
      { header: "Date", key: "Date" },
      { header: "Case name", key: "Case name" },
      { header: "Hearing length", key: "Hearing length" },
      { header: "Hearing type", key: "Hearing type" },
      { header: "Venue", key: "Venue" },
      { header: "Additional information", key: "Additional information" }
    ];

    for (const hearing of hearings) {
      worksheet.addRow(hearing);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async function createInvalidCSTExcel(): Promise<Buffer> {
    const hearings = [
      {
        Date: "01/01/2026",
        "Case name": "Test Case",
        "Hearing length": "",
        "Hearing type": "Substantive hearing",
        Venue: "Care Standards Tribunal",
        "Additional information": "Remote"
      }
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Hearings");

    worksheet.columns = [
      { header: "Date", key: "Date" },
      { header: "Case name", key: "Case name" },
      { header: "Hearing length", key: "Hearing length" },
      { header: "Hearing type", key: "Hearing type" },
      { header: "Venue", key: "Venue" },
      { header: "Additional information", key: "Additional information" }
    ];

    for (const hearing of hearings) {
      worksheet.addRow(hearing);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  describe("createValidCSTExcel", () => {
    it("should create a valid Excel buffer", async () => {
      const buffer = await createValidCSTExcel();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should create an Excel file with correct structure", async () => {
      const buffer = await createValidCSTExcel();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.worksheets).toHaveLength(1);
      expect(workbook.worksheets[0]?.name).toBe("Hearings");
    });

    it("should have correct headers", async () => {
      const buffer = await createValidCSTExcel();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const headerRow = worksheet?.getRow(1);

      expect(headerRow?.getCell(1).value).toBe("Date");
      expect(headerRow?.getCell(2).value).toBe("Case name");
      expect(headerRow?.getCell(3).value).toBe("Hearing length");
      expect(headerRow?.getCell(4).value).toBe("Hearing type");
      expect(headerRow?.getCell(5).value).toBe("Venue");
      expect(headerRow?.getCell(6).value).toBe("Additional information");
    });

    it("should have correct data rows", async () => {
      const buffer = await createValidCSTExcel();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];

      // Should have 4 rows total (1 header + 3 data rows)
      expect(worksheet?.rowCount).toBe(4);

      // Check first data row
      const firstDataRow = worksheet?.getRow(2);
      expect(firstDataRow?.getCell(1).value).toBe("01/01/2026");
      expect(firstDataRow?.getCell(2).value).toBe("Test Case A vs B");
      expect(firstDataRow?.getCell(3).value).toBe("1 hour");
    });
  });

  describe("createInvalidCSTExcel", () => {
    it("should create an Excel buffer with missing required field", async () => {
      const buffer = await createInvalidCSTExcel();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const dataRow = worksheet?.getRow(2);

      // Hearing length should be empty
      expect(dataRow?.getCell(3).value).toBe("");
    });
  });

  describe("ExcelJS compatibility", () => {
    it("should be compatible with our conversion function", async () => {
      const buffer = await createValidCSTExcel();

      // This mimics what our convertExcelToJson does
      const workbook = new ExcelJS.Workbook();
      // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      expect(worksheet).toBeDefined();

      const jsonData: Record<string, unknown>[] = [];
      const headers: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => {
            headers.push(String(cell.value ?? ""));
          });
        } else {
          const rowData: Record<string, unknown> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value ?? "";
            }
          });
          jsonData.push(rowData);
        }
      });

      expect(jsonData).toHaveLength(3);
      expect(jsonData[0]).toMatchObject({
        Date: "01/01/2026",
        "Case name": "Test Case A vs B"
      });
    });
  });
});
