import * as XLSX from "xlsx";

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

const HTML_TAG_PATTERN = /<[^>]+>/;

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
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: false,
    defval: ""
  });

  const minRows = config.minRows ?? 1;
  if (jsonData.length < minRows) {
    throw new Error(`Excel file must contain at least ${minRows} data row${minRows > 1 ? "s" : ""}`);
  }

  const actualHeaders = Object.keys(jsonData[0] || {}).map((h) => h.toLowerCase().trim());
  validateHeaders(actualHeaders, config.fields);

  const results: T[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and row 1 is headers

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

  if (!key) {
    throw new Error(`Missing column '${header}'`);
  }

  const value = row[key];

  if (required && (value === null || value === undefined || String(value).trim() === "")) {
    throw new Error(`Missing required field '${header}' in row ${rowNumber}`);
  }

  return String(value).trim();
}
