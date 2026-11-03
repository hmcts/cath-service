import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { excelCells } from "./excel-cells.js";

async function workbookOf(fill: (sheet: ExcelJS.Worksheet) => void): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  fill(workbook.addWorksheet("List"));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("excelCells", () => {
  it("should read each kind of cell value by its type and text", async () => {
    // Arrange
    const data = await workbookOf((sheet) => {
      sheet.getCell("A1").value = "Case";
      sheet.getCell("A2").value = 42;
      sheet.getCell("A3").value = true;
      sheet.getCell("A4").value = new Date("2026-10-30T00:00:00Z");
      sheet.getCell("A5").value = { richText: [{ text: "Smith " }, { font: { bold: true }, text: "v Jones" }] };
      sheet.getCell("A6").value = { text: "GOV.UK", hyperlink: "https://www.gov.uk" };
      sheet.getCell("A7").value = { error: "#N/A" } as ExcelJS.CellErrorValue;
      sheet.getCell("A8").value = { formula: "A2*2", result: 84 } as ExcelJS.CellFormulaValue;
      sheet.getCell("A9").value = { formula: "A2+1" } as ExcelJS.CellFormulaValue;
      sheet.getCell("A10").value = "";
    });

    // Act
    const content = await excelCells(data);

    // Assert
    expect(content.sheets).toHaveLength(1);
    expect(content.sheets[0].name).toBe("List");
    expect(content.sheets[0].cells).toEqual({
      A1: { type: "text", text: "Case" },
      A2: { type: "number", text: "42" },
      A3: { type: "boolean", text: "true" },
      A4: { type: "date", text: "2026-10-30T00:00:00.000Z" },
      A5: { type: "text", text: "Smith v Jones" },
      A6: { type: "text", text: "GOV.UK" },
      A7: { type: "error", text: "#N/A" },
      A8: { type: "number", text: "84" }
    });
  });

  it("should give a merged range's value to its first cell only and list the merges", async () => {
    // Arrange
    const data = await workbookOf((sheet) => {
      sheet.getCell("A1").value = "Heading";
      sheet.mergeCells("A1:C1");
      sheet.getCell("A2").value = "Row";
    });

    // Act
    const content = await excelCells(data);

    // Assert
    expect(Object.keys(content.sheets[0].cells)).toEqual(["A1", "A2"]);
    expect(content.sheets[0].merges).toEqual(["A1:C1"]);
  });
});
