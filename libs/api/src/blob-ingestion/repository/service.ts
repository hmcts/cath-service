import { randomUUID } from "node:crypto";
import { getLocationById } from "@hmcts/location";
import { sendPublicationNotifications } from "@hmcts/notifications";
import { createArtefact, mockListTypes, Provenance } from "@hmcts/publication";
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
      lastReceivedDate: new Date(),
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

    // Trigger notification for subscribed users (fire-and-forget pattern)
    if (!noMatch) {
      console.log("[blob-ingestion] Triggering notifications for publication:", {
        artefactId,
        courtId: request.court_id,
        listTypeId: validation.listTypeId
      });

      triggerPublicationNotifications(artefactId, request.court_id, validation.listTypeId, new Date(request.content_date)).catch((error) => {
        console.error("Failed to trigger publication notifications:", {
          artefactId,
          courtId: request.court_id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      });
    } else {
      console.log("[blob-ingestion] Skipping notifications (no_match=true):", {
        artefactId,
        courtId: request.court_id
      });
    }

    return {
      success: true,
      artefact_id: artefactId,
      no_match: noMatch,
      message: noMatch ? "Blob ingested but location not found in reference data" : "Blob ingested and published successfully"
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

async function triggerPublicationNotifications(publicationId: string, courtId: string, listTypeId: number, publicationDate: Date): Promise<void> {
  const locationIdNum = Number.parseInt(courtId, 10);
  if (Number.isNaN(locationIdNum)) {
    console.error("Invalid location ID for notifications:", courtId);
    return;
  }

  const location = await getLocationById(locationIdNum);
  if (!location) {
    console.error("Location not found for notifications:", courtId);
    return;
  }

  const listType = mockListTypes.find((lt) => lt.id === listTypeId);
  if (!listType) {
    console.error("List type not found for notifications:", listTypeId);
    return;
  }

  const result = await sendPublicationNotifications({
    publicationId,
    locationId: String(locationIdNum),
    locationName: location.name,
    hearingListName: listType.englishFriendlyName,
    publicationDate
  });

  console.log("Publication notifications sent:", {
    publicationId,
    totalSubscriptions: result.totalSubscriptions,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped
  });

  if (result.errors.length > 0) {
    // Sanitize errors to redact email addresses (PII)
    const sanitizedErrors = result.errors.map((error) => {
      const errorStr = typeof error === "string" ? error : JSON.stringify(error);
      return errorStr.replace(/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]");
    });
    console.error("Notification errors:", { count: result.errors.length, errors: sanitizedErrors });
  }
}
