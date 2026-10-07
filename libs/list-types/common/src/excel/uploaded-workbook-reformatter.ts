import ExcelJSPkg from "exceljs";
import { type FieldConfig, findFieldForHeader, readCellValue } from "../conversion/excel-to-json.js";
import { resolveWorksheet, type WorksheetLocator } from "../conversion/multi-sheet-converter.js";
import { sanitiseCellValue } from "./excel-utilities.js";

const { Workbook } = ExcelJSPkg;

const HEADER_ROW_NUMBER = 1;

export async function reformatUploadedWorkbook(buffer: Buffer, sheets: ReformatSheetConfig[]): Promise<Buffer> {
  const upload = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await upload.xlsx.load(buffer);

  // Copy only what the PDF shows into a fresh workbook. Stripping the upload in place would let through anything
  // nobody thought to remove: hidden sheets, notes, formulas, header/footer text, defined names or author metadata.
  const output = new Workbook();
  // A single-sheet upload can resolve to the same worksheet for several configs; only the first config fed the PDF
  const copiedWorksheets = new Set<ExcelJSPkg.Worksheet>();

  for (const sheet of sheets) {
    const worksheet = resolveWorksheet(upload, sheet, sheet.matchByNameOnly);
    if (!worksheet || copiedWorksheets.has(worksheet)) {
      continue;
    }

    const columns = mapColumnsToFields(worksheet.getRow(HEADER_ROW_NUMBER), sheet.fields);
    if (columns.length === 0) {
      continue;
    }

    copiedWorksheets.add(worksheet);
    copyWorksheet(worksheet, output.addWorksheet(worksheet.name), columns, sheet);
  }

  if (output.worksheets.length === 0) {
    throw new Error("No recognised worksheet to reformat");
  }

  return Buffer.from(await output.xlsx.writeBuffer());
}

function mapColumnsToFields(headerRow: ExcelJSPkg.Row, fields: FieldConfig[]): MappedColumn[] {
  const columns: MappedColumn[] = [];

  headerRow.eachCell((cell, colNumber) => {
    const field = findFieldForHeader(fields, readCellValue(cell.value));
    if (field && !columns.some((column) => column.fieldName === field.fieldName)) {
      columns.push({ sourceColumn: colNumber, fieldName: field.fieldName });
    }
  });

  return columns;
}

function copyWorksheet(source: ExcelJSPkg.Worksheet, target: ExcelJSPkg.Worksheet, columns: MappedColumn[], sheet: ReformatSheetConfig): void {
  columns.forEach(({ sourceColumn }, index) => {
    const { width } = source.getColumn(sourceColumn);
    if (width !== undefined) {
      target.getColumn(index + 1).width = width;
    }
  });
  target.views = [{ state: "frozen", ySplit: HEADER_ROW_NUMBER }];

  source.eachRow((row, rowNumber) => {
    const isHeader = rowNumber === HEADER_ROW_NUMBER;
    const values = isHeader ? readHeadings(row, columns, sheet.headers) : formatDataRow(row, columns, sheet);
    const targetRow = target.getRow(rowNumber);

    if (row.height !== undefined) {
      targetRow.height = row.height;
    }

    columns.forEach(({ sourceColumn }, index) => {
      const targetCell = targetRow.getCell(index + 1);
      const style = structuredClone(row.getCell(sourceColumn).style);

      targetCell.value = sanitiseCellValue(values[index]);
      targetCell.style = isHeader ? { ...style, font: { ...style.font, bold: true } } : style;
    });
  });
}

function readHeadings(headerRow: ExcelJSPkg.Row, columns: MappedColumn[], headers: Readonly<Record<string, string>>): string[] {
  return columns.map(({ sourceColumn, fieldName }) => headers[fieldName] ?? readCellValue(headerRow.getCell(sourceColumn).value));
}

function formatDataRow(row: ExcelJSPkg.Row, columns: MappedColumn[], sheet: ReformatSheetConfig): string[] {
  const rawRow: Record<string, string> = Object.fromEntries(sheet.fields.map((field) => [field.fieldName, ""]));

  for (const { sourceColumn, fieldName } of columns) {
    rawRow[fieldName] = readCellValue(row.getCell(sourceColumn).value);
  }

  const formattedRow = sheet.formatRow(rawRow);
  return columns.map(({ fieldName }) => formattedRow[fieldName] ?? "");
}

export interface ReformatSheetConfig extends WorksheetLocator {
  fields: FieldConfig[];
  headers: Readonly<Record<string, string>>;
  formatRow: (row: Record<string, string>) => Record<string, string>;
  // Must match the converter's option, otherwise the Excel could publish a tab the PDF never showed
  matchByNameOnly?: boolean;
}

interface MappedColumn {
  sourceColumn: number;
  fieldName: string;
}
