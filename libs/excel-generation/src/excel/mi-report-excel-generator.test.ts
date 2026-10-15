import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateMiReportExcel, type MiReportSheet } from "./mi-report-excel-generator.js";

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("generateMiReportExcel", () => {
  it("should produce a single worksheet with the given name, headers and rows", async () => {
    // Arrange
    const sheets: MiReportSheet[] = [
      {
        name: "User Accounts",
        headers: ["user_id", "role"],
        rows: [
          { user_id: "u1", role: "SYSTEM_ADMIN" },
          { user_id: "u2", role: "VERIFIED" }
        ]
      }
    ];

    // Act
    const buffer = await generateMiReportExcel(sheets);
    const workbook = await loadWorkbook(buffer);

    // Assert
    expect(workbook.worksheets).toHaveLength(1);
    const worksheet = workbook.getWorksheet("User Accounts");
    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).values).toEqual([undefined, "user_id", "role"]);
    expect(worksheet?.getRow(2).getCell(1).value).toBe("u1");
    expect(worksheet?.getRow(2).getCell(2).value).toBe("SYSTEM_ADMIN");
    expect(worksheet?.getRow(3).getCell(1).value).toBe("u2");
  });

  it("should produce one worksheet per sheet definition for all-data", async () => {
    // Arrange
    const sheets: MiReportSheet[] = [
      { name: "User Accounts", headers: ["user_id"], rows: [] },
      { name: "Publications", headers: ["artefact_id"], rows: [] },
      { name: "Location Subscriptions", headers: ["id"], rows: [] },
      { name: "All Subscriptions", headers: ["id"], rows: [] }
    ];

    // Act
    const buffer = await generateMiReportExcel(sheets);
    const workbook = await loadWorkbook(buffer);

    // Assert
    expect(workbook.worksheets.map((w) => w.name)).toEqual(["User Accounts", "Publications", "Location Subscriptions", "All Subscriptions"]);
  });

  it("should produce a valid header-only worksheet when there are no rows", async () => {
    // Arrange
    const sheets: MiReportSheet[] = [{ name: "Empty", headers: ["a", "b"], rows: [] }];

    // Act
    const buffer = await generateMiReportExcel(sheets);
    const workbook = await loadWorkbook(buffer);

    // Assert
    const worksheet = workbook.getWorksheet("Empty");
    expect(worksheet?.getRow(1).values).toEqual([undefined, "a", "b"]);
    expect(worksheet?.actualRowCount).toBe(1);
  });

  it("should apply bold header font styling to the header row", async () => {
    // Arrange
    const sheets: MiReportSheet[] = [{ name: "Styled", headers: ["a"], rows: [{ a: "value" }] }];

    // Act
    const buffer = await generateMiReportExcel(sheets);
    const workbook = await loadWorkbook(buffer);

    // Assert
    const worksheet = workbook.getWorksheet("Styled");
    expect(worksheet?.getRow(1).getCell(1).font?.bold).toBe(true);
  });
});
