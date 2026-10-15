import path from "node:path";
import { CONTAINER, deleteBlob, getContentType, uploadBlob } from "@hmcts/azure-blob";
import type { MediaApplicationLoad } from "../account/media-application-transform.js";
import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import type { LegacyStorageReader } from "./legacy-storage-source.js";

const LEGACY_FILES_CONTAINER = "files";

// Runs before the database transaction so an application is only loaded once its proof of ID
// is in place. Copies are idempotent: the target key is derived from the application id.
export async function stageProofOfIdFiles(
  loads: MediaApplicationLoad[],
  reader: LegacyStorageReader,
  isDryRun: boolean
): Promise<DomainTransform<MediaApplicationLoad>> {
  const rejections: Rejection[] = [];
  const rows: MediaApplicationLoad[] = [];

  for (const load of loads) {
    const isAvailable = isDryRun ? await reader.exists(LEGACY_FILES_CONTAINER, load.proofOfIdSourceBlob) : await copyProofOfId(load, reader);

    if (isAvailable) {
      rows.push(load);
    } else {
      rejections.push({ entityId: load.application.id, reason: "proof of ID not found in legacy storage" });
    }
  }

  return { rows, rejections };
}

export async function deleteOrphanedProofOfIdFiles(previousPaths: string[], keptPaths: string[]): Promise<void> {
  const kept = new Set(keptPaths);
  for (const blobName of previousPaths.filter((previousPath) => !kept.has(previousPath))) {
    await deleteBlob(path.basename(blobName), CONTAINER.FILES);
  }
}

async function copyProofOfId(load: MediaApplicationLoad, reader: LegacyStorageReader): Promise<boolean> {
  const file = await reader.download(LEGACY_FILES_CONTAINER, load.proofOfIdSourceBlob);
  if (!file) return false;

  const { proofOfIdPath } = load.application;
  await uploadBlob(proofOfIdPath, file, getContentType(path.extname(proofOfIdPath)), CONTAINER.FILES);
  return true;
}
