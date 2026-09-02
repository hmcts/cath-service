import { randomUUID } from "node:crypto";
import type { CauseListData } from "@hmcts/civil-and-family-daily-cause-list";
import { createArtefact, extractAndStoreArtefactSearch, Provenance, processPublication, updateSourceArtefactId } from "@hmcts/publication";
import { saveUploadedFile } from "../file-storage.js";
import { validateBlobRequest, validateFlatFileRequest } from "../validation.js";
import type { BlobIngestionRequest, BlobIngestionResponse, BlobValidationResult, FlatFileIngestionRequest, IngestionLog, ValidationError } from "./model.js";
import { createIngestionLog } from "./queries.js";

const PROVENANCE_MAP: Record<string, string> = {
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD,
  SNL: Provenance.SNL,
  COMMON_PLATFORM: Provenance.COMMON_PLATFORM,
  CP_CATH: Provenance.CP_CATH,
  PDDA: Provenance.PDDA
};

async function logIngestionResult(params: Omit<IngestionLog, "id" | "timestamp">) {
  await createIngestionLog({ id: randomUUID(), timestamp: new Date(), ...params });
}

async function handleValidationFailure(request: FlatFileIngestionRequest, errors: ValidationError[]): Promise<BlobIngestionResponse> {
  await logIngestionResult({
    sourceSystem: request.provenance || "UNKNOWN",
    courtId: request.court_id || "UNKNOWN",
    status: "VALIDATION_ERROR",
    errorMessage: errors.map((e) => `${e.field}: ${e.message}`).join("; ")
  });
  return { success: false, message: "Validation failed", errors };
}

async function handleMissingListType(request: FlatFileIngestionRequest): Promise<BlobIngestionResponse> {
  await logIngestionResult({
    sourceSystem: request.provenance,
    courtId: request.court_id,
    status: "SYSTEM_ERROR",
    errorMessage: "List type ID not found after validation"
  });
  return { success: false, message: "Internal server error during ingestion" };
}

function buildArtefactParams(request: FlatFileIngestionRequest, validation: BlobValidationResult, isFlatFile: boolean) {
  return {
    type: "LIST",
    locationId: validation.resolvedLocationId ?? request.court_id,
    listTypeId: validation.listTypeId!,
    contentDate: new Date(request.content_date),
    sensitivity: request.sensitivity,
    language: request.language,
    displayFrom: new Date(request.display_from),
    displayTo: new Date(request.display_to),
    lastReceivedDate: new Date(),
    isFlatFile,
    provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
    noMatch: !validation.locationExists
  };
}

function fireAndForgetPublication(
  request: FlatFileIngestionRequest,
  artefactId: string,
  locationId: string,
  listTypeId: number,
  isUpdate: boolean,
  jsonData: CauseListData,
  logPrefix: string
) {
  processPublication({
    artefactId,
    locationId,
    listTypeId,
    contentDate: new Date(request.content_date),
    locale: request.language === "WELSH" ? "cy" : "en",
    jsonData,
    provenance: PROVENANCE_MAP[request.provenance] || request.provenance,
    sensitivity: request.sensitivity,
    language: request.language,
    displayFrom: new Date(request.display_from),
    displayTo: new Date(request.display_to),
    isUpdate,
    logPrefix
  }).catch((error) => {
    console.error(`${logPrefix} Failed to process publication:`, {
      artefactId,
      courtId: request.court_id,
      error: error instanceof Error ? error.message : String(error)
    });
  });
}

export async function processBlobIngestion(request: BlobIngestionRequest, rawBodySize: number): Promise<BlobIngestionResponse> {
  const validation = await validateBlobRequest(request, rawBodySize);

  if (!validation.isValid) {
    return handleValidationFailure(request, validation.errors);
  }

  if (!validation.listTypeId) {
    return handleMissingListType(request);
  }

  const locationId = validation.resolvedLocationId ?? request.court_id;
  const noMatch = !validation.locationExists;

  try {
    const { artefactId, isUpdate } = await createArtefact({ artefactId: randomUUID(), ...buildArtefactParams(request, validation, false) });

    const jsonBuffer = Buffer.from(JSON.stringify(request.hearing_list));
    await saveUploadedFile(artefactId, "upload.json", jsonBuffer);
    await updateSourceArtefactId(artefactId, request.source_artefact_id || null);
    await extractAndStoreArtefactSearch(artefactId, validation.listTypeId, request.hearing_list);

    await logIngestionResult({ sourceSystem: request.provenance, courtId: request.court_id, status: "SUCCESS", artefactId });

    if (!noMatch) {
      fireAndForgetPublication(request, artefactId, locationId, validation.listTypeId, isUpdate, request.hearing_list as CauseListData, "[blob-ingestion]");
    } else {
      console.log("[blob-ingestion] Skipping PDF/notifications (no_match=true):", { artefactId, courtId: request.court_id });
    }

    return {
      success: true,
      artefact_id: artefactId,
      no_match: noMatch,
      message: noMatch ? "Blob ingested but location not found in reference data" : "Blob ingested and published successfully"
    };
  } catch (error) {
    await logIngestionResult({
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SYSTEM_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    return { success: false, message: "Internal server error during ingestion" };
  }
}

export async function processFlatFileBlobIngestion(request: FlatFileIngestionRequest, file: Buffer, fileSize: number): Promise<BlobIngestionResponse> {
  const validation = await validateFlatFileRequest(request, fileSize);

  if (!validation.isValid) {
    return handleValidationFailure(request, validation.errors);
  }

  if (!validation.listTypeId) {
    return handleMissingListType(request);
  }

  const locationId = validation.resolvedLocationId ?? request.court_id;
  const noMatch = !validation.locationExists;
  const sourceArtefactId = request.source_artefact_id || null;

  try {
    const { artefactId, isUpdate } = await createArtefact({ artefactId: randomUUID(), ...buildArtefactParams(request, validation, true) });

    await saveUploadedFile(artefactId, artefactId, file);
    await updateSourceArtefactId(artefactId, sourceArtefactId);

    await logIngestionResult({ sourceSystem: request.provenance, courtId: request.court_id, status: "SUCCESS", artefactId });

    if (!noMatch) {
      processPublication({
        artefactId,
        locationId,
        listTypeId: validation.listTypeId,
        contentDate: new Date(request.content_date),
        locale: request.language === "WELSH" ? "cy" : "en",
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
    await logIngestionResult({
      sourceSystem: request.provenance,
      courtId: request.court_id,
      status: "SYSTEM_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    return { success: false, message: "Internal server error during ingestion" };
  }
}
