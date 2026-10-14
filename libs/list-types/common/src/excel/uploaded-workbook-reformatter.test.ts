import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { FieldConfig } from "../conversion/excel-to-json.js";
import { normaliseHearing } from "../rendering/hearing-normalisation.js";
import { type ReformatSheetConfig, reformatUploadedWorkbook } from "./uploaded-workbook-reformatter.js";

const FIELDS: FieldConfig[] = [
  { header: "Venue", fieldName: "venue" },
  { header: "Time", fieldName: "time" },
  { header: "Additional Information", fieldName: "additionalInformation", required: false }
];

const EN_HEADERS = { venue: "Venue", time: "Time", additionalInformation: "Additional information" };
const CY_HEADERS = { venue: "Lleoliad", time: "Amser", additionalInformation: "Gwybodaeth ychwanegol" };

const UPLOADED_HEADER = ["Venue", "Time", "Additional Information"];
const UPLOADED_ROW = ["Court 1", "10.30", ""];

function sheetConfig(overrides: Partial<ReformatSheetConfig> = {}): ReformatSheetConfig {
  return { worksheetIndex: 0, fields: FIELDS, headers: EN_HEADERS, formatRow: normaliseHearing, ...overrides };
}

async function buildUpload(sheets: Record<string, unknown[][]>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    for (const row of rows) {
      worksheet.addRow(row);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  return workbook;
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

describe("reformatUploadedWorkbook", () => {
  it("should replace known headers with the English headings and make them bold", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional information"]);
    for (const colNumber of [1, 2, 3]) {
      expect(worksheet.getRow(1).getCell(colNumber).font?.bold).toBe(true);
    }
  });

  it("should replace known headers with the Welsh headings", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig({ headers: CY_HEADERS })]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Lleoliad", "Amser", "Gwybodaeth ychwanegol"]);
  });

  it("should format data values with the row formatter", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW, ["Court 2", "2.15pm", "Remote"]] });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
    expect(rowValues(worksheet, 3)).toEqual(["Court 2", "2:15pm", "Remote"]);
  });

  it("should match headers case-insensitively and ignore surrounding whitespace", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [[" venue ", "TIME", "additional information"], UPLOADED_ROW] });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional information"]);
    expect(rowValues(worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
  });

  it("should give reordered columns the heading for their own field", async () => {
    // Arrange
    const upload = await buildUpload({
      Sheet1: [
        ["Time", "Additional Information", "Venue"],
        ["10.30", "", "Court 1"]
      ]
    });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig({ headers: CY_HEADERS })]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Amser", "Gwybodaeth ychwanegol", "Lleoliad"]);
    expect(rowValues(worksheet, 2)).toEqual(["10:30", "", "Court 1"]);
  });

  it("should keep unknown extra columns as uploaded and not make their header bold", async () => {
    // Arrange
    const upload = await buildUpload({
      Sheet1: [
        [...UPLOADED_HEADER, "Notes", "More"],
        [...UPLOADED_ROW, "10.30 note", "x"]
      ]
    });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional information", "Notes", "More"]);
    expect(rowValues(worksheet, 2)).toEqual(["Court 1", "10:30", "", "10.30 note", "x"]);
    expect(worksheet.getRow(1).getCell(4).font?.bold).toBeFalsy();
  });

  it("should resolve sheets by name and by index fallback", async () => {
    // Arrange
    const upload = await buildUpload({
      Other: [["Venue"], ["Ignored"]],
      "Main hearings": [UPLOADED_HEADER, UPLOADED_ROW],
      Third: [UPLOADED_HEADER, ["Court 3", "9.00am", ""]]
    });
    const sheets = [
      sheetConfig({ worksheetName: "Main hearings", worksheetIndex: 0 }),
      sheetConfig({ worksheetName: "Planning Court", worksheetIndex: 2, headers: CY_HEADERS })
    ];

    // Act
    const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

    // Assert
    expect(rowValues(workbook.getWorksheet("Main hearings") as ExcelJS.Worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
    expect(rowValues(workbook.getWorksheet("Third") as ExcelJS.Worksheet, 1)).toEqual(["Lleoliad", "Amser", "Gwybodaeth ychwanegol"]);
    expect(rowValues(workbook.getWorksheet("Third") as ExcelJS.Worksheet, 2)).toEqual(["Court 3", "9:00am", ""]);
  });

  it("should leave sheets that no config resolves unchanged", async () => {
    // Arrange
    const upload = await buildUpload({ Main: [UPLOADED_HEADER, UPLOADED_ROW], Extra: [UPLOADED_HEADER, UPLOADED_ROW] });

    // Act
    const workbook = await load(await reformatUploadedWorkbook(upload, [sheetConfig({ worksheetName: "Main" })]));

    // Assert
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Main", "Extra"]);
    const extra = workbook.getWorksheet("Extra") as ExcelJS.Worksheet;
    expect(rowValues(extra, 1)).toEqual(UPLOADED_HEADER);
    expect(rowValues(extra, 2)).toEqual(["Court 1", "10.30", ""]);
    expect(extra.getRow(1).getCell(1).font?.bold).toBeFalsy();
  });

  it("should skip an empty sheet and still reformat the next sheet", async () => {
    // Arrange
    const upload = await buildUpload({ Empty: [], Second: [UPLOADED_HEADER, UPLOADED_ROW] });
    const sheets = [sheetConfig({ worksheetName: "Empty" }), sheetConfig({ worksheetName: "Second", worksheetIndex: 1 })];

    // Act
    const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

    // Assert
    expect((workbook.getWorksheet("Empty") as ExcelJS.Worksheet).actualRowCount).toBe(0);
    expect(rowValues(workbook.getWorksheet("Second") as ExcelJS.Worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
  });

  it("should leave a sheet unchanged when no header is recognised", async () => {
    // Arrange
    const upload = await buildUpload({
      Sheet1: [
        ["Notes", "Other"],
        ["10.30", "x"]
      ]
    });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Notes", "Other"]);
    expect(rowValues(worksheet, 2)).toEqual(["10.30", "x"]);
  });

  it("should reformat a worksheet only once when several configs resolve to it", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
    const sheets = [sheetConfig({ worksheetName: "Main hearings" }), sheetConfig({ worksheetName: "Sheet1", headers: CY_HEADERS })];

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, sheets))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional information"]);
  });

  it("should keep styling of untouched cells and bold only the header cells", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Styled");
    worksheet.addRow([...UPLOADED_HEADER, "Notes"]);
    worksheet.addRow([...UPLOADED_ROW, "note"]);
    worksheet.getCell("D2").font = { italic: true, color: { argb: "FFFF0000" } };
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    worksheet.getColumn(1).width = 30;
    const upload = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act
    const result = (await load(await reformatUploadedWorkbook(upload, [sheetConfig({ worksheetName: "Styled" })]))).worksheets[0];

    // Assert
    expect(result.name).toBe("Styled");
    expect(result.getCell("D2").font).toEqual({ italic: true, color: { argb: "FFFF0000" } });
    expect(result.getCell("A1").fill).toEqual({ type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } });
    expect(result.getCell("A1").font?.bold).toBe(true);
    expect(result.getCell("A2").font?.bold).toBeFalsy();
    expect(result.getColumn(1).width).toBe(30);
  });

  it("should write rewritten values starting with formula characters as plain text", async () => {
    // Arrange
    const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, ["=SUM(A1)", "+10.30", "@remote"], ["-court", "9am", "- note"]] });

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig()]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 2)).toEqual(["=SUM(A1)", "+10:30", "@remote"]);
    expect(rowValues(worksheet, 3)).toEqual(["-court", "9am", "- note"]);
    expect(worksheet.getCell("A2").type).toBe(ExcelJS.ValueType.String);
  });

  it("should read typed cells the same way as the upload conversion", async () => {
    // Arrange
    const upload = await buildUpload({
      Sheet1: [
        ["Date", ...UPLOADED_HEADER],
        [new Date(Date.UTC(2025, 0, 15, 12)), "Court 1", 10.3, ""]
      ]
    });
    const fields: FieldConfig[] = [{ header: "Date", fieldName: "date" }, ...FIELDS];

    // Act
    const worksheet = (await load(await reformatUploadedWorkbook(upload, [sheetConfig({ fields, headers: { ...EN_HEADERS, date: "Date" } })]))).worksheets[0];

    // Assert
    expect(rowValues(worksheet, 2)).toEqual(["15/01/2025", "Court 1", "10:3", ""]);
  });

  it("should reject a buffer that is not a valid workbook", async () => {
    // Arrange
    const invalid = Buffer.from("not an excel file");

    // Act
    const result = reformatUploadedWorkbook(invalid, [sheetConfig()]);

    // Assert
    await expect(result).rejects.toThrow();
  });
});
