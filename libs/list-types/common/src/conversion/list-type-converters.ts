import { convertExcelToJson, type ExcelConverterConfig, validateDateFormat, validateNoHtmlTags } from "./excel-to-json.js";

export interface ListTypeConverter {
  config: ExcelConverterConfig;
  convertExcelToJson: (buffer: Buffer) => Promise<unknown[]>;
  validateJson?: (data: unknown) => { isValid: boolean; errors: string[] };
}

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

// Care Standards Tribunal Weekly Hearing List (listTypeId: 9)
const CST_EXCEL_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Date",
      fieldName: "date",
      required: true,
      validators: [validateDateFormat(DATE_PATTERN, "dd/MM/yyyy (e.g., 02/01/2025)")]
    },
    {
      header: "Case name",
      fieldName: "caseName",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Case name", rowNumber)]
    },
    {
      header: "Hearing length",
      fieldName: "hearingLength",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing length", rowNumber)]
    },
    {
      header: "Hearing type",
      fieldName: "hearingType",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Hearing type", rowNumber)]
    },
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Additional information",
      fieldName: "additionalInformation",
      required: true,
      validators: [(value, rowNumber) => validateNoHtmlTags(value, "Additional information", rowNumber)]
    }
  ],
  minRows: 1
};

const cstConverter: ListTypeConverter = {
  config: CST_EXCEL_CONFIG,
  convertExcelToJson: async (buffer: Buffer) => {
    return convertExcelToJson(buffer, CST_EXCEL_CONFIG);
  }
};

// Registry mapping list type IDs to their converters
const converterRegistry = new Map<number, ListTypeConverter>([
  [9, cstConverter] // Care Standards Tribunal Weekly Hearing List
]);

export function getConverterForListType(listTypeId: number): ListTypeConverter | undefined {
  return converterRegistry.get(listTypeId);
}

export function hasConverterForListType(listTypeId: number): boolean {
  return converterRegistry.has(listTypeId);
}

export async function convertExcelForListType(listTypeId: number, buffer: Buffer): Promise<unknown[]> {
  const converter = getConverterForListType(listTypeId);
  if (!converter) {
    throw new Error(`No converter found for list type ID: ${listTypeId}`);
  }
  return converter.convertExcelToJson(buffer);
}
