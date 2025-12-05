import type { ExcelConverterConfig } from "./excel-to-json.js";
import { convertExcelToJson } from "./excel-to-json.js";

export interface ListTypeConverter {
  config: ExcelConverterConfig;
  convertExcelToJson: (buffer: Buffer) => Promise<unknown[]>;
  validateJson?: (data: unknown) => { isValid: boolean; errors: string[] };
}

// Registry mapping list type IDs to their converters
const converterRegistry = new Map<number, ListTypeConverter>();

export function registerConverter(listTypeId: number, converter: ListTypeConverter): void {
  converterRegistry.set(listTypeId, converter);
}

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

export function createConverter(config: ExcelConverterConfig): ListTypeConverter {
  return {
    config,
    convertExcelToJson: async (buffer: Buffer) => {
      return convertExcelToJson(buffer, config);
    }
  };
}
