import { randomUUID } from "node:crypto";
import type { CauseListData } from "@hmcts/civil-and-family-daily-cause-list";
import { createArtefact, extractAndStoreArtefactSearch, Provenance, processPublication, updateSourceArtefactId } from "@hmcts/publication";
import { saveUploadedFile } from "../file-storage.js";
import { validateBlobRequest, validateFlatFileRequest } from "../validation.js";
import type { BlobIngestionRequest, BlobIngestionResponse, FlatFileIngestionRequest } from "./model.js";
import { createIngestionLog } from "./queries.js";

const PROVENANCE_MAP: Record<string, string> = {
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD,
  SNL: Provenance.SNL,
  COMMON_PLATFORM: Provenance.COMMON_PLATFORM,
  CP_CATH: Provenance.CP_CATH,
  PDDA: Provenance.PDDA
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

  const locationId = validation.resolvedLocationId ?? request.court_id;

  try {
    // Create artefact in database (returns actual artefact ID - either new or existing)
    const { artefactId, isUpdate } = await createArtefact({
      artefactId: newArtefactId,
      type: "LIST",
      locationId,
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

    // Save JSON to blob storage for list display pages
    const jsonBuffer = Buffer.from(JSON.stringify(request.hearing_list));
    await saveUploadedFile(artefactId, "upload.json", jsonBuffer);
    await updateSourceArtefactId(artefactId, request.source_artefact_id ?? "");

    // Extract and store artefact search data for case number/name search
    await extractAndStoreArtefactSearch(artefactId, validation.listTypeId, request.hearing_list);

    // Log successful ingestion
    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SUCCESS",
      artefactId
    });

    // Generate PDF and send notifications using common processor (fire-and-forget for notifications)
    if (!noMatch) {
      processPublication({
        artefactId,
        locationId,
        listTypeId: validation.listTypeId,
        contentDate: new Date(request.content_date),
        locale: request.language === "WELSH" ? "cy" : "en",
        jsonData: request.hearing_list as CauseListData,
        provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
        sensitivity: request.sensitivity,
        language: request.language,
        displayFrom: new Date(request.display_from),
        displayTo: new Date(request.display_to),
        isUpdate,
        logPrefix: "[blob-ingestion]"
      }).catch((error) => {
        console.error("[blob-ingestion] Failed to process publication:", {
          artefactId,
          courtId: request.court_id,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    } else {
      console.log("[blob-ingestion] Skipping PDF/notifications (no_match=true):", {
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

export async function processFlatFileBlobIngestion(request: FlatFileIngestionRequest, file: Buffer, fileSize: number): Promise<BlobIngestionResponse> {
  const validation = await validateFlatFileRequest(request, fileSize);

  if (!validation.isValid) {
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

  if (!validation.listTypeId) {
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

  const locationId = validation.resolvedLocationId ?? request.court_id;
  const sourceArtefactId = request.source_artefact_id ?? "";

  try {
    const { artefactId, isUpdate } = await createArtefact({
      artefactId: newArtefactId,
      type: "LIST",
      locationId,
      listTypeId: validation.listTypeId,
      contentDate: new Date(request.content_date),
      sensitivity: request.sensitivity,
      language: request.language,
      displayFrom: new Date(request.display_from),
      displayTo: new Date(request.display_to),
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
      noMatch
    });

    const fileName = sourceArtefactId || `${artefactId}.pdf`;
    await saveUploadedFile(artefactId, fileName, file);
    await updateSourceArtefactId(artefactId, sourceArtefactId);

    await createIngestionLog({
      id: randomUUID(),
      timestamp: new Date(),
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SUCCESS",
      artefactId
    });

    if (!noMatch) {
      processPublication({
        artefactId,
        locationId,
        listTypeId: validation.listTypeId,
        contentDate: new Date(request.content_date),
        locale: request.language === "WELSH" ? "cy" : "en",
        jsonData: {} as CauseListData,
        provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
        sensitivity: request.sensitivity,
        language: request.language,
        displayFrom: new Date(request.display_from),
        displayTo: new Date(request.display_to),
        isUpdate,
        logPrefix: "[flat-file-ingestion]"
      }).catch((error) => {
        console.error("[flat-file-ingestion] Failed to process publication:", {
          artefactId,
          courtId: request.court_id,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }

    return {
      success: true,
      artefact_id: artefactId,
      no_match: noMatch,
      message: noMatch ? "Flat file ingested but location not found in reference data" : "Flat file ingested successfully"
    };
  } catch (error) {
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
