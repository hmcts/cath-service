export interface ValidationError {
  text: string;
  href: string;
}

export interface CsvRow {
  LOCATION_ID: string;
  LOCATION_NAME: string;
  WELSH_LOCATION_NAME: string;
  EMAIL: string;
  CONTACT_NO: string;
  SUB_JURISDICTION_NAME: string;
  REGION_NAME: string;
}

export interface ParsedLocationData {
  locationId: number;
  locationName: string;
  welshLocationName: string;
  email: string;
  contactNo: string;
  subJurisdictionNames: string[];
  regionNames: string[];
}

export interface EnrichedLocationData extends ParsedLocationData {
  jurisdictionNames: string[];
  jurisdictionWelshNames: string[];
  subJurisdictionWelshNames: string[];
  regionWelshNames: string[];
}

export interface UploadSessionData {
  fileBuffer: Buffer | any; // Can be serialized as plain object in session
  fileName: string;
  mimeType: string;
}
