import { CONTAINER, deleteBlob, getBlobProperties, uploadBlob } from "@hmcts/azure-blob";
import { getContentTypeFromExtension } from "@hmcts/publication";
import type { ArtefactLoad, MigratedArtefact } from "../publication/artefact-transform.js";
import { detectFlatFileExtension, withFlatFileExtension } from "../publication/flat-file-type.js";
import type { Rejection } from "../sync/sync-report.js";
import type { LegacyStorageReader } from "./legacy-storage-source.js";

const LEGACY_ARTEFACT_CONTAINER = "artefact";
// Stamped on the copied payload only once its derived data is built, so a failure is retried.
export const SYNC_MARKER_KEY = "legacylastreceived";

// Runs before the database transaction so an artefact row is only written once its payload is
// in place. An artefact whose payload already carries the current marker is left untouched.
export async function stageArtefactPayloads(
  loads: ArtefactLoad[],
  existingById: Map<string, MigratedArtefact>,
  reader: LegacyStorageReader,
  isDryRun: boolean
): Promise<StagedArtefacts> {
  const rows: MigratedArtefact[] = [];
  const changed: MigratedArtefact[] = [];
  const rejections: Rejection[] = [];

  for (const load of loads) {
    const { artefact } = load;
    const existing = existingById.get(artefact.artefactId);

    if (existing && (await isUpToDate(artefact))) {
      // Unchanged: keep the extension chosen when the flat file was first copied.
      rows.push({ ...artefact, sourceArtefactId: existing.sourceArtefactId });
      continue;
    }

    const result = await copyPayload(load, reader, isDryRun);
    if (result.ok) {
      rows.push(result.artefact);
      changed.push(result.artefact);
    } else {
      rejections.push({ entityId: artefact.artefactId, reason: result.reason });
    }
  }

  return { rows, changed, rejections };
}

export async function deleteRemovedArtefactFiles(artefactIds: string[]): Promise<void> {
  for (const artefactId of artefactIds) {
    await deleteBlob(artefactId, CONTAINER.ARTEFACT);
    await deleteBlob(`${artefactId}.pdf`, CONTAINER.PUBLICATIONS);
    await deleteBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);
  }
}

export function syncMarker(artefact: MigratedArtefact): string {
  return artefact.lastReceivedDate.toISOString();
}

async function isUpToDate(artefact: MigratedArtefact): Promise<boolean> {
  const properties = await getBlobProperties(artefact.artefactId, CONTAINER.ARTEFACT);
  return properties?.metadata[SYNC_MARKER_KEY] === syncMarker(artefact);
}

async function copyPayload(load: ArtefactLoad, reader: LegacyStorageReader, isDryRun: boolean): Promise<CopyResult> {
  const { artefact } = load;
  const payload = await reader.download(LEGACY_ARTEFACT_CONTAINER, load.legacyPayloadBlob);
  if (!payload) return { ok: false, reason: "payload not found in legacy storage" };

  let sourceArtefactId = artefact.sourceArtefactId;
  let contentType = "application/json";

  if (artefact.isFlatFile) {
    const extension = detectFlatFileExtension(payload);
    if (!extension) return { ok: false, reason: "could not determine flat file type" };
    sourceArtefactId = withFlatFileExtension(artefact.sourceArtefactId, artefact.artefactId, extension);
    contentType = getContentTypeFromExtension(extension);
  } else if (!isJson(payload)) {
    return { ok: false, reason: "payload is not valid JSON" };
  }

  // Same blob name the ingest path writes: the bare artefact id.
  if (!isDryRun) {
    await uploadBlob(artefact.artefactId, payload, contentType, CONTAINER.ARTEFACT);
  }

  return { ok: true, artefact: { ...artefact, sourceArtefactId } };
}

function isJson(payload: Buffer): boolean {
  try {
    JSON.parse(payload.toString("utf8"));
    return true;
  } catch {
    return false;
  }
}

export interface StagedArtefacts {
  rows: MigratedArtefact[];
  // New or changed since the last run; these need derived data built after the transaction.
  changed: MigratedArtefact[];
  rejections: Rejection[];
}

type CopyResult = { ok: true; artefact: MigratedArtefact } | { ok: false; reason: string };
