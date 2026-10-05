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

export function readCellValue(value: unknown): string {
  const formatted = formatDateValue(value);
  return formatted === null || formatted === undefined ? "" : String(formatted).trim();
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

function formatDateValue(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return value;
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
    const value = getField(row, field, rowNumber);

    if (value && field.validators) {
      for (const validator of field.validators) {
        validator(value, rowNumber);
      }
    }

    result[field.fieldName] = value;
  }

  return result;
}

function getField(row: Record<string, unknown>, field: FieldConfig, rowNumber: number): string {
  const key = Object.keys(row).find((k) => findFieldForHeader([field], k));
  const value = key ? readCellValue(row[key]) : "";

  if (value === "" && (field.required ?? true)) {
    throw new Error(`Missing required field '${field.header}' in row ${rowNumber}`);
  }

  return value;
}
