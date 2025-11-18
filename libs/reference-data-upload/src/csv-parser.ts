import Papa from "papaparse";
import type { CsvRow, ParsedLocationData } from "./model.js";

const REQUIRED_HEADERS = ["LOCATION_ID", "LOCATION_NAME", "WELSH_LOCATION_NAME", "EMAIL", "CONTACT_NO", "SUB_JURISDICTION_NAME", "REGION_NAME"];

export interface ParseResult {
  success: boolean;
  data: ParsedLocationData[];
  errors: string[];
}

export function parseCsv(fileBuffer: Buffer): ParseResult {
  let csvText = fileBuffer.toString("utf-8");
  const errors: string[] = [];

  // Remove BOM if present
  if (csvText.charCodeAt(0) === 0xfeff) {
    csvText = csvText.substring(1);
  }

  console.log("First 200 chars of CSV:", csvText.substring(0, 200));
  console.log("File size:", fileBuffer.length, "bytes");

  const parseResult = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim()
  });

  // Filter out delimiter auto-detection warnings - these are not real errors
  const realErrors = parseResult.errors.filter((err) => !err.message.includes("Unable to auto-detect delimiting character"));

  if (realErrors.length > 0) {
    return {
      success: false,
      data: [],
      errors: realErrors.map((err) => `CSV parsing error at row ${err.row}: ${err.message}`)
    };
  }

  const headers = parseResult.meta.fields || [];
  console.log("Detected headers:", headers);
  console.log("Required headers:", REQUIRED_HEADERS);

  const missingHeaders = REQUIRED_HEADERS.filter((required) => !headers.includes(required));

  if (missingHeaders.length > 0) {
    console.log("Missing headers:", missingHeaders);
    errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
    return { success: false, data: [], errors };
  }

  const parsedData: ParsedLocationData[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNumber = i + 2;

    if (!row.LOCATION_ID || !row.LOCATION_ID.trim()) {
      errors.push(`Row ${rowNumber}: LOCATION_ID is required`);
      continue;
    }

    const locationId = Number.parseInt(row.LOCATION_ID.trim(), 10);
    if (Number.isNaN(locationId)) {
      errors.push(`Row ${rowNumber}: LOCATION_ID must be a valid integer`);
      continue;
    }

    const subJurisdictionNames = row.SUB_JURISDICTION_NAME
      ? row.SUB_JURISDICTION_NAME.split(";")
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : [];

    const regionNames = row.REGION_NAME
      ? row.REGION_NAME.split(";")
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : [];

    parsedData.push({
      locationId,
      locationName: row.LOCATION_NAME ? row.LOCATION_NAME.trim() : "",
      welshLocationName: row.WELSH_LOCATION_NAME ? row.WELSH_LOCATION_NAME.trim() : "",
      email: row.EMAIL ? row.EMAIL.trim() : "",
      contactNo: row.CONTACT_NO ? row.CONTACT_NO.trim() : "",
      subJurisdictionNames,
      regionNames
    });
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors };
  }

  return { success: true, data: parsedData, errors: [] };
}
