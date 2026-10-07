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

const WORKBOOK_PROPERTIES = {
  creator: "Jane Clerk",
  lastModifiedBy: "John Admin",
  company: "Court Office",
  manager: "Senior Clerk",
  title: "Internal working copy",
  subject: "Do not publish",
  keywords: "internal",
  description: "Contains staff notes"
} as const;

function sheetConfig(overrides: Partial<ReformatSheetConfig> = {}): ReformatSheetConfig {
  return { worksheetIndex: 0, fields: FIELDS, headers: EN_HEADERS, formatRow: normaliseHearing, ...overrides };
}

function buildWorkbook(sheets: Record<string, unknown[][]>): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    for (const row of rows) {
      worksheet.addRow(row);
    }
  }
  return workbook;
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildUpload(sheets: Record<string, unknown[][]>): Promise<Buffer> {
  return toBuffer(buildWorkbook(sheets));
}

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);
  return workbook;
}

async function reformatFirstSheet(upload: Buffer, sheets: ReformatSheetConfig[] = [sheetConfig()]): Promise<ExcelJS.Worksheet> {
  return (await load(await reformatUploadedWorkbook(upload, sheets))).worksheets[0];
}

function rowValues(worksheet: ExcelJS.Worksheet | undefined, rowNumber: number): unknown[] {
  if (!worksheet) {
    throw new Error("Worksheet not found");
  }
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

function allCells(worksheet: ExcelJS.Worksheet): ExcelJS.Cell[] {
  const cells: ExcelJS.Cell[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell);
    });
  });
  return cells;
}

describe("reformatUploadedWorkbook", () => {
  describe("headings and values", () => {
    it("should replace known headers with the English headings and make them bold", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });

      // Act
      const worksheet = await reformatFirstSheet(upload);

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
      const worksheet = await reformatFirstSheet(upload, [sheetConfig({ headers: CY_HEADERS })]);

      // Assert
      expect(rowValues(worksheet, 1)).toEqual(["Lleoliad", "Amser", "Gwybodaeth ychwanegol"]);
    });

    it("should keep the uploaded header text when no heading is configured for a field", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });

      // Act
      const worksheet = await reformatFirstSheet(upload, [sheetConfig({ headers: { venue: "Venue" } })]);

      // Assert
      expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional Information"]);
    });

    it("should format data values with the row formatter", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW, ["Court 2", "2.15pm", "Remote"]] });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(rowValues(worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
      expect(rowValues(worksheet, 3)).toEqual(["Court 2", "2:15pm", "Remote"]);
    });

    it("should match headers case-insensitively and ignore surrounding whitespace", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [[" venue ", "TIME", "additional information"], UPLOADED_ROW] });

      // Act
      const worksheet = await reformatFirstSheet(upload);

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
      const worksheet = await reformatFirstSheet(upload, [sheetConfig({ headers: CY_HEADERS })]);

      // Assert
      expect(rowValues(worksheet, 1)).toEqual(["Amser", "Gwybodaeth ychwanegol", "Lleoliad"]);
      expect(rowValues(worksheet, 2)).toEqual(["10:30", "", "Court 1"]);
    });

    it("should copy only the first column when a header is repeated", async () => {
      // Arrange
      const upload = await buildUpload({
        Sheet1: [
          [...UPLOADED_HEADER, "Venue"],
          [...UPLOADED_ROW, "Court 9"]
        ]
      });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(rowValues(worksheet, 1)).toEqual(["Venue", "Time", "Additional information"]);
      expect(rowValues(worksheet, 2)).toEqual(["Court 1", "10:30", ""]);
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
      const worksheet = await reformatFirstSheet(upload, [sheetConfig({ fields, headers: { ...EN_HEADERS, date: "Date" } })]);

      // Assert
      expect(rowValues(worksheet, 2)).toEqual(["15/01/2025", "Court 1", "10:3", ""]);
    });

    it("should write a mapped rich text cell as readable text", async () => {
      // Arrange
      const upload = await buildUpload({
        Sheet1: [UPLOADED_HEADER, [{ richText: [{ font: { bold: true }, text: "Court " }, { text: "1" }] }, "10.30", ""]]
      });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(worksheet.getCell("A2").value).toBe("Court 1");
    });

    it("should write values starting with formula characters as plain text with a leading apostrophe", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, ["=SUM(A1)", "+10.30", "@remote"], ["-court", "9am", "- note"]] });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(rowValues(worksheet, 2)).toEqual(["'=SUM(A1)", "'+10:30", "'@remote"]);
      expect(rowValues(worksheet, 3)).toEqual(["'-court", "9am", "'- note"]);
      expect(worksheet.getCell("A2").type).toBe(ExcelJS.ValueType.String);
    });
  });

  describe("sheet selection", () => {
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
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Main hearings", "Third"]);
      expect(rowValues(workbook.getWorksheet("Main hearings"), 2)).toEqual(["Court 1", "10:30", ""]);
      expect(rowValues(workbook.getWorksheet("Third"), 1)).toEqual(["Lleoliad", "Amser", "Gwybodaeth ychwanegol"]);
      expect(rowValues(workbook.getWorksheet("Third"), 2)).toEqual(["Court 3", "9:00am", ""]);
    });

    it("should not fall back to a sheet position when matchByNameOnly is set", async () => {
      // Arrange
      const upload = await buildUpload({
        "Appeal List": [UPLOADED_HEADER, UPLOADED_ROW],
        Notes: [UPLOADED_HEADER, ["Court 9", "9.00", "Working copy"]]
      });
      const sheets = [
        sheetConfig({ worksheetName: "Appeal List", worksheetIndex: 0, matchByNameOnly: true }),
        sheetConfig({ worksheetName: "Business List", worksheetIndex: 1, matchByNameOnly: true })
      ];

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

      // Assert
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Appeal List"]);
    });

    it("should still fall back to a sheet position when matchByNameOnly is not set", async () => {
      // Arrange
      const upload = await buildUpload({
        "Appeal List": [UPLOADED_HEADER, UPLOADED_ROW],
        Notes: [UPLOADED_HEADER, ["Court 9", "9.00", "Working copy"]]
      });
      const sheets = [sheetConfig({ worksheetName: "Appeal List", worksheetIndex: 0 }), sheetConfig({ worksheetName: "Business List", worksheetIndex: 1 })];

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

      // Assert
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Appeal List", "Notes"]);
    });

    it("should throw when matchByNameOnly is set and no sheet name matches", async () => {
      // Arrange
      const upload = await buildUpload({ "Sheet 1": [UPLOADED_HEADER, UPLOADED_ROW] });

      // Act
      const result = reformatUploadedWorkbook(upload, [sheetConfig({ worksheetName: "Appeal List", matchByNameOnly: true })]);

      // Assert
      await expect(result).rejects.toThrow("No recognised worksheet to reformat");
    });

    it("should drop sheets that no config resolves", async () => {
      // Arrange
      const upload = await buildUpload({ Main: [UPLOADED_HEADER, UPLOADED_ROW], Extra: [UPLOADED_HEADER, UPLOADED_ROW] });

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, [sheetConfig({ worksheetName: "Main" })]));

      // Assert
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Main"]);
    });

    it("should drop an empty sheet and still reformat the next sheet", async () => {
      // Arrange
      const upload = await buildUpload({ Empty: [], Second: [UPLOADED_HEADER, UPLOADED_ROW] });
      const sheets = [sheetConfig({ worksheetName: "Empty" }), sheetConfig({ worksheetName: "Second", worksheetIndex: 1 })];

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

      // Assert
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Second"]);
      expect(rowValues(workbook.getWorksheet("Second"), 2)).toEqual(["Court 1", "10:30", ""]);
    });

    it("should drop a resolved sheet when none of its headers is recognised", async () => {
      // Arrange
      const upload = await buildUpload({
        Notes: [
          ["Notes", "Other"],
          ["10.30", "x"]
        ],
        Hearings: [UPLOADED_HEADER, UPLOADED_ROW]
      });
      const sheets = [sheetConfig({ worksheetName: "Notes" }), sheetConfig({ worksheetName: "Hearings", worksheetIndex: 1 })];

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

      // Assert
      expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Hearings"]);
    });

    it("should reformat a worksheet only once when several configs resolve to it", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
      const sheets = [sheetConfig({ worksheetName: "Main hearings" }), sheetConfig({ worksheetName: "Sheet1", headers: CY_HEADERS })];

      // Act
      const workbook = await load(await reformatUploadedWorkbook(upload, sheets));

      // Assert
      expect(workbook.worksheets).toHaveLength(1);
      expect(rowValues(workbook.worksheets[0], 1)).toEqual(["Venue", "Time", "Additional information"]);
    });

    it("should throw when no sheet is recognised", async () => {
      // Arrange
      const upload = await buildUpload({
        Sheet1: [
          ["Notes", "Other"],
          ["10.30", "x"]
        ]
      });

      // Act
      const result = reformatUploadedWorkbook(upload, [sheetConfig()]);

      // Assert
      await expect(result).rejects.toThrow("No recognised worksheet to reformat");
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

  describe("layout kept from the upload", () => {
    it("should keep the sheet name, cell styles, column widths and row heights of the mapped data", async () => {
      // Arrange
      const workbook = buildWorkbook({ Styled: [UPLOADED_HEADER, UPLOADED_ROW] });
      const worksheet = workbook.getWorksheet("Styled") as ExcelJS.Worksheet;
      worksheet.getCell("B2").font = { italic: true, color: { argb: "FFFF0000" } };
      worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      worksheet.getColumn(1).width = 30;
      worksheet.getRow(2).height = 40;
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload, [sheetConfig({ worksheetName: "Styled" })]);

      // Assert
      expect(result.name).toBe("Styled");
      expect(result.getCell("B2").font).toEqual({ italic: true, color: { argb: "FFFF0000" } });
      expect(result.getCell("A1").fill).toEqual({ type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } });
      expect(result.getCell("A1").font?.bold).toBe(true);
      expect(result.getCell("A2").font?.bold).toBeFalsy();
      expect(result.getColumn(1).width).toBe(30);
      expect(result.getRow(2).height).toBe(40);
    });

    it("should not share a style object between the header cells it makes bold", async () => {
      // Arrange
      const workbook = buildWorkbook({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
      const worksheet = workbook.worksheets[0];
      const sharedFont = { italic: true };
      worksheet.getCell("A1").font = sharedFont;
      worksheet.getCell("A2").font = sharedFont;
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload);

      // Assert
      expect(result.getCell("A1").font).toEqual({ italic: true, bold: true });
      expect(result.getCell("A2").font).toEqual({ italic: true });
    });

    it("should freeze the header row", async () => {
      // Arrange
      const upload = await buildUpload({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(worksheet.views[0]).toEqual(expect.objectContaining({ state: "frozen", ySplit: 1 }));
    });
  });

  describe("content the PDF does not show", () => {
    it("should drop unknown columns and pack the mapped columns in uploaded order", async () => {
      // Arrange
      const upload = await buildUpload({
        Sheet1: [
          ["Internal notes", "Time", "More", "Venue", "Additional Information"],
          ["Defendant is vulnerable", "10.30", "x", "Court 1", "Remote"]
        ]
      });

      // Act
      const worksheet = await reformatFirstSheet(upload);

      // Assert
      expect(rowValues(worksheet, 1)).toEqual(["Time", "Venue", "Additional information"]);
      expect(rowValues(worksheet, 2)).toEqual(["10:30", "Court 1", "Remote"]);
      expect(worksheet.columnCount).toBe(3);
    });

    it("should drop a hidden extra sheet", async () => {
      // Arrange
      const workbook = buildWorkbook({ Hearings: [UPLOADED_HEADER, UPLOADED_ROW], Private: [UPLOADED_HEADER, ["Secret court", "9.00", ""]] });
      (workbook.getWorksheet("Private") as ExcelJS.Worksheet).state = "hidden";
      const upload = await toBuffer(workbook);

      // Act
      const result = await load(await reformatUploadedWorkbook(upload, [sheetConfig()]));

      // Assert
      expect(result.worksheets.map((worksheet) => worksheet.name)).toEqual(["Hearings"]);
    });

    it("should output a hidden first data sheet as a visible sheet because it fed the PDF", async () => {
      // Arrange
      const workbook = buildWorkbook({ Hearings: [UPLOADED_HEADER, UPLOADED_ROW], Cover: [["Cover page"]] });
      (workbook.getWorksheet("Hearings") as ExcelJS.Worksheet).state = "hidden";
      const upload = await toBuffer(workbook);

      // Act
      const result = await load(await reformatUploadedWorkbook(upload, [sheetConfig()]));

      // Assert
      expect(result.worksheets.map((worksheet) => [worksheet.name, worksheet.state])).toEqual([["Hearings", "visible"]]);
    });

    it("should unhide hidden rows and mapped columns and keep the hidden rows", async () => {
      // Arrange
      const workbook = buildWorkbook({
        Sheet1: [
          [...UPLOADED_HEADER, "Hidden notes"],
          [...UPLOADED_ROW, "secret"],
          ["Court 2", "11.00", "", "secret"]
        ]
      });
      const worksheet = workbook.worksheets[0];
      worksheet.getRow(2).hidden = true;
      worksheet.getColumn(2).hidden = true;
      worksheet.getColumn(4).hidden = true;
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload);

      // Assert
      expect(rowValues(result, 2)).toEqual(["Court 1", "10:30", ""]);
      expect(rowValues(result, 3)).toEqual(["Court 2", "11:00", ""]);
      expect([1, 2, 3].map((rowNumber) => result.getRow(rowNumber).hidden)).toEqual([false, false, false]);
      expect([1, 2, 3].map((colNumber) => result.getColumn(colNumber).hidden)).toEqual([false, false, false]);
      expect(result.columnCount).toBe(3);
    });

    it("should clear cell notes", async () => {
      // Arrange
      const workbook = buildWorkbook({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
      workbook.worksheets[0].getCell("A2").note = "Defendant is vulnerable - do not publish";
      workbook.worksheets[0].getCell("A1").note = "Header note";
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload);

      // Assert
      expect(allCells(result).filter((cell) => cell.note !== undefined)).toEqual([]);
    });

    it("should not copy the uploaded workbook properties", async () => {
      // Arrange
      const workbook = buildWorkbook({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
      Object.assign(workbook, WORKBOOK_PROPERTIES);
      const upload = await toBuffer(workbook);

      // Act
      const result = await load(await reformatUploadedWorkbook(upload, [sheetConfig()]));

      // Assert
      for (const [property, uploadedValue] of Object.entries(WORKBOOK_PROPERTIES)) {
        expect(result[property as keyof typeof WORKBOOK_PROPERTIES]).not.toBe(uploadedValue);
      }
    });

    it("should leave no formula cells and drop a HYPERLINK formula in an unmapped column", async () => {
      // Arrange
      const workbook = buildWorkbook({
        Sheet1: [
          [...UPLOADED_HEADER, "Link"],
          ["Court 1", "10.30", "", ""],
          ["Court 2", "11.00", "", ""]
        ]
      });
      const worksheet = workbook.worksheets[0];
      worksheet.getCell("C2").value = { formula: 'A2&" note"', result: "Court 1 note" };
      worksheet.getCell("C3").value = { sharedFormula: "C2", result: "Court 2 note" };
      worksheet.getCell("D2").value = { formula: 'HYPERLINK("http://evil.example","click")', result: "click" };
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload);

      // Assert
      const cells = allCells(result);
      expect(cells.filter((cell) => cell.type === ExcelJS.ValueType.Formula)).toEqual([]);
      expect(cells.map((cell) => cell.value)).not.toContain("click");
      expect(result.columnCount).toBe(3);
    });

    it("should write the cached result of a mapped formula", async () => {
      // Arrange
      const workbook = buildWorkbook({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW] });
      workbook.worksheets[0].getCell("A2").value = { formula: 'CONCAT("Court ","1")', result: "Court 1" };
      const upload = await toBuffer(workbook);

      // Act
      const result = await reformatFirstSheet(upload);

      // Assert
      expect(result.getCell("A2").value).toBe("Court 1");
      expect(result.getCell("A2").type).toBe(ExcelJS.ValueType.String);
    });

    it("should not copy the header and footer, defined names, merges or data validations", async () => {
      // Arrange
      const workbook = buildWorkbook({ Sheet1: [UPLOADED_HEADER, UPLOADED_ROW, ["Court 2", "11.00", ""]] });
      const worksheet = workbook.worksheets[0];
      worksheet.headerFooter.oddHeader = "Prepared by Jane Clerk";
      worksheet.headerFooter.oddFooter = "Internal use only";
      workbook.definedNames.add("Sheet1!$A$2", "secretCell");
      worksheet.mergeCells("A3:B3");
      worksheet.getCell("C2").dataValidation = { type: "list", allowBlank: true, formulae: ['"Remote,In person"'] };
      const upload = await toBuffer(workbook);

      // Act
      const result = await load(await reformatUploadedWorkbook(upload, [sheetConfig()]));

      // Assert
      const output = result.worksheets[0];
      expect(output.headerFooter?.oddHeader).toBeFalsy();
      expect(output.headerFooter?.oddFooter).toBeFalsy();
      expect(result.definedNames.model).toEqual([]);
      expect(output.getCell("B3").isMerged).toBe(false);
      expect(output.getCell("C2").dataValidation).toBeUndefined();
    });
  });
});
