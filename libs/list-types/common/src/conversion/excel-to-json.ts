import ExcelJSPkg from "exceljs";

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

const HTML_TAG_PATTERN = /<[^>]{1,200}>/;

// Excel stores time-only values against the 1899-12-30 epoch, so ExcelJS reads a
// cell like "10:30" back as a Date of 1899-12-30T10:30:00Z. Rendering that as a
// date discards the time; format it as a time string (e.g. "10:30am") instead so
// time columns validate. The wall-clock time is encoded in UTC by ExcelJS.
const EXCEL_TIME_EPOCH_YEAR = 1899;

function formatExcelTime(value: Date): string {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const period = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour12}${period}` : `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
}

function formatDateValue(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (value.getUTCFullYear() === EXCEL_TIME_EPOCH_YEAR) {
      return formatExcelTime(value);
    }
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return value;
}

// ExcelJS returns rich objects for some cell types: hyperlinks as { text, hyperlink },
// rich text as { richText: [...] }, and formulae as { result }. Extract the plain
// text so downstream string handling doesn't produce "[object Object]".
function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) {
    return formatDateValue(value);
  }
  if (value && typeof value === "object") {
    const cell = value as Record<string, unknown>;
    if (Array.isArray(cell.richText)) {
      return cell.richText.map((run) => (run as { text?: string }).text ?? "").join("");
    }
    if ("text" in cell) {
      return normalizeCellValue(cell.text);
    }
    if ("result" in cell) {
      return normalizeCellValue(cell.result);
    }
    if ("hyperlink" in cell) {
      return cell.hyperlink;
    }
  }
  return value;
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
  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  const jsonData: Record<string, unknown>[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value ?? ""));
      });
    } else {
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = normalizeCellValue(cell.value) ?? "";
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
    const actualHeaders = headers.map((h) => h.toLowerCase().trim());
    validateHeaders(actualHeaders, config.fields);
  }

  const results: T[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2;

    try {
      const result = parseRow(row, rowNumber, config.fields);
      results.push(result as T);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error in row ${rowNumber}: ${error.message}`);
      }
      throw error;
    }
  }

  return results;
}

function validateHeaders(actualHeaders: string[], fields: FieldConfig[]): void {
  const expectedHeaders = fields.map((f) => f.header.toLowerCase());
  const missingHeaders = expectedHeaders.filter((expected) => !actualHeaders.includes(expected));

  if (missingHeaders.length > 0) {
    const headerNames = fields.filter((f) => missingHeaders.includes(f.header.toLowerCase())).map((f) => f.header);

    throw new Error(`Excel file must contain columns: ${fields.map((f) => f.header).join(", ")}. Missing: ${headerNames.join(", ")}`);
  }
}

function parseRow(row: Record<string, unknown>, rowNumber: number, fields: FieldConfig[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const field of fields) {
    const value = getField(row, field.header, rowNumber, field.required ?? true);

    if (value && field.validators) {
      for (const validator of field.validators) {
        validator(value, rowNumber);
      }
    }

    result[field.fieldName] = value;
  }

  return result;
}

function getField(row: Record<string, unknown>, header: string, rowNumber: number, required: boolean): string {
  const keys = Object.keys(row);
  const key = keys.find((k) => k.toLowerCase().trim() === header.toLowerCase());

  const value = key ? row[key] : undefined;

  if (value === null || value === undefined || String(value).trim() === "") {
    if (required) {
      throw new Error(`Missing required field '${header}' in row ${rowNumber}`);
    }
    return "";
  }

  return String(value).trim();
}
