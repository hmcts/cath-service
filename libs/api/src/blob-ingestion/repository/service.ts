import { randomUUID } from "node:crypto";
import type { CauseListData } from "@hmcts/civil-and-family-daily-cause-list";
import { createArtefact, extractAndStoreArtefactSearch, isNoMatchLocationId, Provenance, processPublication, updateSourceArtefactId } from "@hmcts/publication";
import { buildArtefactResponse, joinValidationMessages } from "../artefact-response.js";
import { saveUploadedFile } from "../file-storage.js";
import type { PublicationMetadata } from "../publication-headers.js";
import { validateBlobRequest, validateFlatFileRequest } from "../validation.js";
import type { BlobValidationResult, IngestionLog, PublicationIngestionResult, ValidationError } from "./model.js";
import { createIngestionLog } from "./queries.js";

const PROVENANCE_MAP: Record<string, string> = {
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD,
  SNL: Provenance.SNL,
  COMMON_PLATFORM: Provenance.COMMON_PLATFORM,
  CP_CATH: Provenance.CP_CATH,
  PDDA: Provenance.PDDA
};

const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";

export async function logIngestionResult(params: Omit<IngestionLog, "id" | "timestamp">) {
  await createIngestionLog({ id: randomUUID(), timestamp: new Date(), ...params });
}

export async function processBlobIngestion(metadata: PublicationMetadata, payload: unknown, rawBodySize: number): Promise<PublicationIngestionResult> {
  const validation = await validateBlobRequest(metadata, payload, rawBodySize);

  if (!validation.isValid) {
    return handleValidationFailure(metadata, validation.errors);
  }

  if (!validation.listTypeId) {
    return handleMissingListType(metadata);
  }

  const locationId = validation.resolvedLocationId ?? metadata.courtId;
  const noMatch = isNoMatchLocationId(locationId);

  try {
    const { artefactId, isUpdate } = await createArtefact({ artefactId: randomUUID(), ...buildArtefactParams(metadata, validation, false) });

    const jsonBuffer = Buffer.from(JSON.stringify(payload));
    const blobUrl = await saveUploadedFile(artefactId, "upload.json", jsonBuffer);
    await updateSourceArtefactId(artefactId, metadata.sourceArtefactId);
    const cases = await extractAndStoreArtefactSearch(artefactId, validation.listTypeId, payload);

    await logIngestionResult({ sourceSystem: metadata.provenance, courtId: metadata.courtId, status: "SUCCESS", artefactId });

    if (!noMatch) {
      fireAndForgetPublication(metadata, artefactId, locationId, validation.listTypeId, isUpdate, payload as CauseListData, "[blob-ingestion]");
    } else {
      console.log("[blob-ingestion] Skipping PDF/notifications (no_match=true):", { artefactId, courtId: metadata.courtId });
    }

    return {
      outcome: "CREATED",
      artefact: buildArtefactResponse({ metadata, artefactId, isFlatFile: false, payload: blobUrl, cases, locationId })
    };
  } catch (error) {
    return handleIngestionError(metadata, error);
  }
}

export async function processFlatFileBlobIngestion(metadata: PublicationMetadata, file: Buffer, fileSize: number): Promise<PublicationIngestionResult> {
  const validation = await validateFlatFileRequest(metadata, fileSize);

  if (!validation.isValid) {
    return handleValidationFailure(metadata, validation.errors);
  }

  if (!validation.listTypeId) {
    return handleMissingListType(metadata);
  }

  const locationId = validation.resolvedLocationId ?? metadata.courtId;
  const noMatch = isNoMatchLocationId(locationId);

  try {
    const { artefactId, isUpdate } = await createArtefact({ artefactId: randomUUID(), ...buildArtefactParams(metadata, validation, true) });

    const blobUrl = await saveUploadedFile(artefactId, artefactId, file);
    await updateSourceArtefactId(artefactId, metadata.sourceArtefactId);

    await logIngestionResult({ sourceSystem: metadata.provenance, courtId: metadata.courtId, status: "SUCCESS", artefactId });

    if (!noMatch) {
      fireAndForgetPublication(metadata, artefactId, locationId, validation.listTypeId, isUpdate, undefined, "[flat-file-ingestion]");
    }

    return {
      outcome: "CREATED",
      artefact: buildArtefactResponse({ metadata, artefactId, isFlatFile: true, payload: blobUrl, locationId })
    };
  } catch (error) {
    return handleIngestionError(metadata, error);
  }
}

async function handleValidationFailure(metadata: PublicationMetadata, errors: ValidationError[]): Promise<PublicationIngestionResult> {
  await logIngestionResult({
    sourceSystem: metadata.provenance || "UNKNOWN",
    courtId: metadata.courtId || "UNKNOWN",
    status: "VALIDATION_ERROR",
    errorMessage: errors.map((e) => `${e.field}: ${e.message}`).join("; ")
  });
  return { outcome: "VALIDATION_ERROR", message: joinValidationMessages(errors), errors };
}

async function handleMissingListType(metadata: PublicationMetadata): Promise<PublicationIngestionResult> {
  await logIngestionResult({
    sourceSystem: metadata.provenance,
    courtId: metadata.courtId,
    status: "SYSTEM_ERROR",
    errorMessage: "List type ID not found after validation"
  });
  return { outcome: "ERROR", message: "Internal server error during ingestion" };
}

async function handleIngestionError(metadata: PublicationMetadata, error: unknown): Promise<PublicationIngestionResult> {
  await logIngestionResult({
    sourceSystem: metadata.provenance,
    courtId: metadata.courtId,
    status: "SYSTEM_ERROR",
    errorMessage: error instanceof Error ? error.message : "Unknown error"
  });

  if (isUniqueConstraintViolation(error)) {
    return { outcome: "CONFLICT", message: "A publication with these details is already being created" };
  }

  return { outcome: "ERROR", message: "Internal server error during ingestion" };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === PRISMA_UNIQUE_CONSTRAINT_CODE;
}

function buildArtefactParams(metadata: PublicationMetadata, validation: BlobValidationResult, isFlatFile: boolean) {
  return {
    type: metadata.type,
    locationId: validation.resolvedLocationId ?? metadata.courtId,
    listTypeId: validation.listTypeId as number,
    contentDate: new Date(metadata.contentDate),
    sensitivity: metadata.sensitivity,
    language: metadata.language,
    displayFrom: toDateOrNull(metadata.displayFrom),
    displayTo: toDateOrNull(metadata.displayTo),
    lastReceivedDate: new Date(),
    isFlatFile,
    provenance: PROVENANCE_MAP[metadata.provenance] || metadata.provenance
  };
}

function fireAndForgetPublication(
  metadata: PublicationMetadata,
  artefactId: string,
  locationId: string,
  listTypeId: number,
  isUpdate: boolean,
  jsonData: CauseListData | undefined,
  logPrefix: string
) {
  processPublication({
    artefactId,
    locationId,
    listTypeId,
    contentDate: new Date(metadata.contentDate),
    locale: metadata.language === "WELSH" ? "cy" : "en",
    jsonData,
    provenance: PROVENANCE_MAP[metadata.provenance] || metadata.provenance,
    sensitivity: metadata.sensitivity,
    language: metadata.language,
    displayFrom: toDateOrNull(metadata.displayFrom),
    displayTo: toDateOrNull(metadata.displayTo),
    isUpdate,
    logPrefix
  }).catch((error) => {
    console.error(`${logPrefix} Failed to process publication:`, {
      artefactId,
      courtId: metadata.courtId,
      error: error instanceof Error ? error.message : String(error)
    });
  });
}

function toDateOrNull(value: string | null): Date | null {
  return value ? new Date(value) : null;
}
