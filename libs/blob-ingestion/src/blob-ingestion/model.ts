/**
 * Request body for blob ingestion API
 *
 * @property list_type - The list type name (e.g., "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", "CROWN_DAILY_LIST")
 *                       The API accepts the list type name and maps it internally to the corresponding ID
 * @property content_date - The content date in ISO 8601 date format (YYYY-MM-DD) - REQUIRED
 */
export interface BlobIngestionRequest {
  court_id: string;
  provenance: string;
  content_date: string;
  list_type: string;
  sensitivity: string;
  language: string;
  display_from: string;
  display_to: string;
  hearing_list: unknown;
}

export interface BlobIngestionResponse {
  success: boolean;
  artefact_id?: string;
  no_match?: boolean;
  message: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface BlobValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  locationExists: boolean;
  listTypeId?: number;
}

export interface IngestionLog {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  courtId: string;
  status: "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR";
  errorMessage?: string;
  artefactId?: string;
}
