import ExcelJSPkg from "exceljs";
import { ExcelFileReadError, ExcelValidationError, type ExcelValidationIssue } from "./excel-validation-error.js";

const { Workbook } = ExcelJSPkg;

export interface FieldConfig {
  header: string;
  fieldName: string;
  required?: boolean;
  validators?: ((value: string, rowNumber: number) => void)[];
}

export interface ExcelConverterConfig {
  fields: FieldConfig[];
  minRows?: number;
}

export interface ExcelConversionResult<T = Record<string, string>> {
  data: T[];
  errors: string[];
}

const MISSING_REQUIRED_VALUE_REASON = "Missing required value";

const HTML_TAG_PATTERN = /<[^>]{1,200}>/;

// Excel stores time-only values against the 1899-12-30 epoch, so ExcelJS reads a
// cell like "10:30" back as a Date of 1899-12-30T10:30:00Z. Rendering that as a
// date discards the time; format it as a time string (e.g. "10:30am") instead so
// time columns validate. The wall-clock time is encoded in UTC by ExcelJS.
const EXCEL_TIME_EPOCH_YEAR = 1899;

export function readCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return formatDateValue(value);
  }
  if (typeof value !== "object") {
    return String(value).trim();
  }
  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  if ("formula" in value || "sharedFormula" in value || "result" in value) {
    return "result" in value ? readCellValue(value.result) : "";
  }
  if ("text" in value) {
    return readCellValue(value.text);
  }
  if ("hyperlink" in value) {
    return readCellValue(value.hyperlink);
  }
  // Error values (e.g. #REF!) and unknown shapes are treated as empty so required-field validation catches them
  return "";
}

export function findFieldForHeader(fields: FieldConfig[], header: string): FieldConfig | undefined {
  const normalisedHeader = header.toLowerCase().trim();
  return fields.find((field) => field.header.toLowerCase() === normalisedHeader);
}

export function validateNoHtmlTags(value: string, fieldName: string, rowNumber: number): void {
  if (HTML_TAG_PATTERN.test(value)) {
    throw new Error(`Invalid content in '${fieldName}' in row ${rowNumber}: HTML tags are not allowed`);
  }
}

export function validateDateFormat(pattern: RegExp, format: string) {
  return (value: string, rowNumber: number): void => {
    if (!pattern.test(value)) {
      throw new Error(`Invalid date format '${value}' in row ${rowNumber}. Expected format: ${format}`);
    }

    const [day, month, year] = value.split("/").map(Number);
    const dateObj = new Date(year, month - 1, day);

    if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
      throw new Error(`Invalid date '${value}' in row ${rowNumber}. Date does not exist in calendar`);
    }
  };
}

export async function convertExcelToJson<T = Record<string, string>>(buffer: Buffer, config: ExcelConverterConfig): Promise<T[]> {
  const workbook = await loadWorkbook(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  const jsonData: Record<string, unknown>[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Indexed by column so a blank header cell does not shift the headers after it
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = readCellValue(cell.value);
      });
    } else {
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = readCellValue(cell.value);
        }
      });
      jsonData.push(rowData);
    }
  });

  const minRows = config.minRows ?? 1;
  if (jsonData.length < minRows) {
    throw new Error(`Excel file must contain at least ${minRows} data row${minRows > 1 ? "s" : ""}`);
  }

  if (jsonData.length > 0) {
    const actualHeaders = headers.map((h) => h?.toLowerCase().trim());
    const headerIssue = findMissingHeadersIssue(actualHeaders, config.fields);
    if (headerIssue) {
      throw new ExcelValidationError([headerIssue], []);
    }
  }

  const results: T[] = [];
  const issues: ExcelValidationIssue[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const parsed = parseRow(jsonData[i], i + 1, i + 2, config.fields);
    results.push(parsed.data as T);
    issues.push(...parsed.issues);
  }

  if (issues.length > 0) {
    throw new ExcelValidationError(issues, results);
  }

  return results;
}

export async function loadWorkbook(buffer: Buffer): Promise<ExcelJSPkg.Workbook> {
  const workbook = new Workbook();
  try {
    // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
    await workbook.xlsx.load(buffer);
  } catch (error) {
    throw new ExcelFileReadError(error);
  }
  return workbook;
}

function formatDateValue(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    return String(value);
  }
  if (value.getUTCFullYear() === EXCEL_TIME_EPOCH_YEAR) {
    return formatExcelTime(value);
  }
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatExcelTime(value: Date): string {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const period = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour12}${period}` : `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
}

function findMissingHeadersIssue(actualHeaders: (string | undefined)[], fields: FieldConfig[]): ExcelValidationIssue | undefined {
  const missingHeaders = fields.filter((field) => !actualHeaders.includes(field.header.toLowerCase())).map((field) => field.header);

  if (missingHeaders.length === 0) {
    return undefined;
  }

  return {
    reason: `Missing columns: ${missingHeaders.join(", ")}`,
    message: `Excel file must contain columns: ${fields.map((f) => f.header).join(", ")}. Missing: ${missingHeaders.join(", ")}`
  };
}

function parseRow(row: Record<string, unknown>, dataRowNumber: number, legacyRowNumber: number, fields: FieldConfig[]): ParsedRow {
  const data: Record<string, string> = {};
  const issues: ExcelValidationIssue[] = [];

  for (const field of fields) {
    const value = getField(row, field);
    data[field.fieldName] = value;

    if (value === "") {
      if (field.required ?? true) {
        issues.push({
          rowNumber: dataRowNumber,
          columnHeader: field.header,
          reason: MISSING_REQUIRED_VALUE_REASON,
          message: `Error in row ${legacyRowNumber}: Missing required field '${field.header}' in row ${legacyRowNumber}`
        });
      }
      continue;
    }

    const validatorMessage = runValidators(value, legacyRowNumber, field.validators);
    if (validatorMessage) {
      issues.push({
        rowNumber: dataRowNumber,
        columnHeader: field.header,
        reason: validatorMessage.replace(` in row ${legacyRowNumber}`, ""),
        message: `Error in row ${legacyRowNumber}: ${validatorMessage}`
      });
    }
  }

  return { data, issues };
}

function getField(row: Record<string, unknown>, field: FieldConfig): string {
  const key = Object.keys(row).find((k) => findFieldForHeader([field], k));
  return key ? readCellValue(row[key]) : "";
}

// Returns the first validator failure for the field, so one cell yields at most one issue
function runValidators(value: string, rowNumber: number, validators: FieldConfig["validators"] = []): string | undefined {
  for (const validator of validators) {
    try {
      validator(value, rowNumber);
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      throw error;
    }
  }
  return undefined;
}

interface ParsedRow {
  data: Record<string, string>;
  issues: ExcelValidationIssue[];
}
