import { CONTAINER, deleteBlob, downloadBlob, setBlobMetadata, uploadBlob } from "@hmcts/azure-blob";
import { type ListTypeInfo, validateListTypeJson } from "@hmcts/list-types-common";
import { deleteArtefactSearchByArtefactId, extractAndStoreArtefactSearch } from "@hmcts/publication";
import type { MigratedArtefact } from "../publication/artefact-transform.js";
import type { Rejection, StepReport } from "../sync/sync-report.js";
import { SYNC_MARKER_KEY, syncMarker } from "./artefact-payload.js";
import type { LegacyStorageReader } from "./legacy-storage-source.js";

const LEGACY_PUBLICATIONS_CONTAINER = "publications";

// Legacy names its generated files exactly as this service does, by artefact id, so they are
// copied rather than regenerated. They are only needed until the migrated lists expire.
const GENERATED_FILES = [
  { extension: ".pdf", contentType: "application/pdf" },
  { extension: ".xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
];

// Nothing here can send an email or a third-party push: it never goes near processPublication.
// Each artefact is isolated: a failure is reported, leaves the sync marker unset, and is
// retried on the next run.
export async function buildDerivedData(changed: MigratedArtefact[], listTypes: ListTypeInfo[], reader: LegacyStorageReader): Promise<StepReport> {
  const rejections: Rejection[] = [];
  let processed = 0;

  for (const artefact of changed) {
    try {
      if (!artefact.isFlatFile) {
        rejections.push(...(await rebuildSearchIndex(artefact, listTypes)));
        await copyGeneratedFiles(artefact.artefactId, reader);
      }
      await setBlobMetadata(artefact.artefactId, { [SYNC_MARKER_KEY]: syncMarker(artefact) }, CONTAINER.ARTEFACT);
      processed++;
    } catch (error) {
      rejections.push({ entityId: artefact.artefactId, reason: `derived data failed: ${error instanceof Error ? error.message : String(error)}` });
    }
  }

  return { name: "artefact_derived_data", processed, rejections };
}

// Returns problems worth reporting that do not stop the artefact being published.
async function rebuildSearchIndex(artefact: MigratedArtefact, listTypes: ListTypeInfo[]): Promise<Rejection[]> {
  const { artefactId, listTypeId } = artefact;
  const payload = await downloadBlob(artefactId, CONTAINER.ARTEFACT);
  if (!payload) throw new Error("copied payload not found");

  const jsonData: unknown = JSON.parse(payload.toString("utf8"));
  const problems: Rejection[] = [];

  // Loaded even when invalid: dropping a list that is live in legacy is worse than rendering it imperfectly.
  const validation = await validateListTypeJson(String(listTypeId), jsonData, listTypes);
  if (!validation.isValid) {
    problems.push({ entityId: artefactId, reason: "payload fails schema validation" });
  }

  // The extractor leaves old rows in place when it finds no cases, so clear them first.
  await deleteArtefactSearchByArtefactId(artefactId);
  await extractAndStoreArtefactSearch(artefactId, listTypeId, jsonData);

  return problems;
}

// A file legacy no longer has belongs to a superseded version of the list, so any copy here
// is removed rather than left to be served.
async function copyGeneratedFiles(artefactId: string, reader: LegacyStorageReader): Promise<void> {
  for (const { extension, contentType } of GENERATED_FILES) {
    const blobName = `${artefactId}${extension}`;
    const file = await reader.download(LEGACY_PUBLICATIONS_CONTAINER, blobName);

    if (file) {
      await uploadBlob(blobName, file, contentType, CONTAINER.PUBLICATIONS);
    } else {
      await deleteBlob(blobName, CONTAINER.PUBLICATIONS);
    }
  }
}
