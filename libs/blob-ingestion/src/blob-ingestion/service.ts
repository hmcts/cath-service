import { randomUUID } from "node:crypto";
import { createArtefact, Provenance } from "@hmcts/publication";
import type { BlobIngestionRequest, BlobIngestionResponse } from "./model.js";
import { createIngestionLog } from "./queries.js";
import { validateBlobRequest } from "./validation.js";

const PROVENANCE_MAP: Record<string, string> = {
  XHIBIT: Provenance.XHIBIT,
  LIBRA: Provenance.LIBRA,
  SJP: Provenance.SJP,
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD
};

export async function processBlobIngestion(request: BlobIngestionRequest, rawBodySize: number): Promise<BlobIngestionResponse> {
  // Validate request
  const validation = await validateBlobRequest(request, rawBodySize);

  if (!validation.isValid) {
    // Log validation failure
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance || "UNKNOWN",
      courtId: request.court_id || "UNKNOWN",
      status: "VALIDATION_ERROR",
      errorMessage: validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ")
    });

    return {
      success: false,
      message: "Validation failed",
      errors: validation.errors
    };
  }

  const artefactId = randomUUID();
  const noMatch = !validation.locationExists;

  // List type ID should always be present after successful validation
  if (!validation.listTypeId) {
    throw new Error("List type ID not found after validation");
  }

  try {
    // Create artefact in database
    await createArtefact({
      artefactId,
      locationId: request.court_id,
      listTypeId: validation.listTypeId,
      contentDate: new Date(request.publication_date),
      sensitivity: request.sensitivity,
      language: request.language,
      displayFrom: new Date(request.display_from),
      displayTo: new Date(request.display_to),
      isFlatFile: false,
      provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
      noMatch
    });

    // Log successful ingestion
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SUCCESS",
      artefactId
    });

    return {
      success: true,
      artefact_id: artefactId,
      no_match: noMatch,
      message: noMatch ? "Blob ingested but location not found in reference data (no_match=true)" : "Blob ingested and published successfully"
    };
  } catch (error) {
    // Log system error
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SYSTEM_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      success: false,
      message: "Internal server error during ingestion"
    };
  }
}
