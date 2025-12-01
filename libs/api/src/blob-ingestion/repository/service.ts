import { randomUUID } from "node:crypto";
import { sendPublicationNotifications } from "@hmcts/notification";
import { createArtefact, Provenance } from "@hmcts/publication";
import { saveUploadedFile } from "../file-storage.js";
import { validateBlobRequest } from "../validation.js";
import type { BlobIngestionRequest, BlobIngestionResponse } from "./model.js";
import { createIngestionLog } from "./queries.js";

const PROVENANCE_MAP: Record<string, string> = {
  XHIBIT: Provenance.XHIBIT,
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD,
  SNL: Provenance.SNL,
  COMMON_PLATFORM: Provenance.COMMON_PLATFORM
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

  const newArtefactId = randomUUID();
  const noMatch = !validation.locationExists;

  // List type ID should always be present after successful validation
  if (!validation.listTypeId) {
    console.error("System error: List type ID not found after validation", {
      courtId: request.court_id,
      listType: request.list_type,
      validationResult: validation.isValid
    });

    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SYSTEM_ERROR",
      errorMessage: "List type ID not found after validation"
    });

    return {
      success: false,
      message: "Internal server error during ingestion"
    };
  }

  try {
    // Create artefact in database (returns actual artefact ID - either new or existing)
    const artefactId = await createArtefact({
      artefactId: newArtefactId,
      locationId: request.court_id,
      listTypeId: validation.listTypeId,
      contentDate: new Date(request.content_date),
      sensitivity: request.sensitivity,
      language: request.language,
      displayFrom: new Date(request.display_from),
      displayTo: new Date(request.display_to),
      isFlatFile: false,
      provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
      noMatch
    });

    // Save JSON to temp storage for list display pages
    const jsonBuffer = Buffer.from(JSON.stringify(request.hearing_list));
    await saveUploadedFile(artefactId, "upload.json", jsonBuffer);

    // Log successful ingestion
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SUCCESS",
      artefactId
    });

    // Trigger email notifications for subscribers (only if location exists)
    if (!noMatch) {
      try {
        const notificationResult = await sendPublicationNotifications({
          publicationId: artefactId,
          locationId: request.court_id,
          hearingListName: request.list_type,
          publicationDate: new Date(request.content_date).toISOString()
        });

        console.log("[Blob Ingestion] Notification process completed", {
          artefactId,
          locationId: request.court_id,
          notificationResult,
          timestamp: new Date().toISOString()
        });
      } catch (notificationError) {
        console.error("[Blob Ingestion] Failed to send notifications", {
          artefactId,
          locationId: request.court_id,
          error: notificationError instanceof Error ? notificationError.message : "Unknown error",
          timestamp: new Date().toISOString()
        });
      }
    }

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
