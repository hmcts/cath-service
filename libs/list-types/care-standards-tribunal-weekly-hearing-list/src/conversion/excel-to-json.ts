import * as XLSX from "xlsx";
import type { CareStandardsTribunalHearing } from "../models/types.js";

const EXPECTED_HEADERS = ["date", "case name", "hearing length", "hearing type", "venue", "additional information"];

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const HTML_TAG_PATTERN = /<[^>]+>/;

export async function convertExcelToJson(buffer: Buffer): Promise<CareStandardsTribunalHearing[]> {
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

  if (jsonData.length === 0) {
    throw new Error("Excel file must contain at least one hearing");
  }

  const actualHeaders = Object.keys(jsonData[0] || {}).map((h) => h.toLowerCase().trim());
  validateHeaders(actualHeaders);

  const hearings: CareStandardsTribunalHearing[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and row 1 is headers

    try {
      const hearing = parseRow(row, rowNumber);
      hearings.push(hearing);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error in row ${rowNumber}: ${error.message}`);
      }
      throw error;
    }
  }

  return hearings;
}

function validateHeaders(actualHeaders: string[]): void {
  const missingHeaders = EXPECTED_HEADERS.filter((expected) => !actualHeaders.includes(expected));

  if (missingHeaders.length > 0) {
    throw new Error(
      `Excel file must contain columns: ${EXPECTED_HEADERS.map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(", ")}. Missing: ${missingHeaders.map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(", ")}`
    );
  }
}

function parseRow(row: Record<string, unknown>, rowNumber: number): CareStandardsTribunalHearing {
  const date = getField(row, "date", rowNumber);
  const caseName = getField(row, "case name", rowNumber);
  const hearingLength = getField(row, "hearing length", rowNumber);
  const hearingType = getField(row, "hearing type", rowNumber);
  const venue = getField(row, "venue", rowNumber);
  const additionalInformation = getField(row, "additional information", rowNumber);

  validateDate(date, rowNumber);
  validateNoHtmlTags(caseName, "Case name", rowNumber);
  validateNoHtmlTags(hearingLength, "Hearing length", rowNumber);
  validateNoHtmlTags(hearingType, "Hearing type", rowNumber);
  validateNoHtmlTags(venue, "Venue", rowNumber);
  validateNoHtmlTags(additionalInformation, "Additional information", rowNumber);

  return {
    date,
    caseName,
    hearingLength,
    hearingType,
    venue,
    additionalInformation
  };
}

function getField(row: Record<string, unknown>, fieldName: string, rowNumber: number): string {
  const keys = Object.keys(row);
  const key = keys.find((k) => k.toLowerCase().trim() === fieldName.toLowerCase());

  if (!key) {
    throw new Error(`Missing column '${fieldName}'`);
  }

  const value = row[key];

  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`Missing required field '${fieldName}' in row ${rowNumber}`);
  }

  return String(value).trim();
}

function validateDate(date: string, rowNumber: number): void {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`Invalid date format '${date}' in row ${rowNumber}. Expected format: dd/MM/yyyy (e.g., 02/01/2025)`);
  }

  const [day, month, year] = date.split("/").map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
    throw new Error(`Invalid date '${date}' in row ${rowNumber}. Date does not exist in calendar`);
  }
}

function validateNoHtmlTags(value: string, fieldName: string, rowNumber: number): void {
  if (HTML_TAG_PATTERN.test(value)) {
    throw new Error(`Invalid content in '${fieldName}' in row ${rowNumber}: HTML tags are not allowed`);
  }
}
