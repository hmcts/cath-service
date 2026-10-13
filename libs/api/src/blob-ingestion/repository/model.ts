import type { ArtefactResponse } from "../artefact-response.js";

export type IngestionOutcome = "CREATED" | "VALIDATION_ERROR" | "CONFLICT" | "ERROR";

export interface PublicationIngestionResult {
  outcome: IngestionOutcome;
  artefact?: ArtefactResponse;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface BlobValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  listTypeId?: number;
  /**
   * Always set when a court id was supplied: either the resolved location id, or the submitted
   * id behind the "NoMatch" prefix when reference data has no match. Use `isNoMatchLocationId`
   * rather than a separate flag to tell the two apart.
   */
  resolvedLocationId?: string;
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
