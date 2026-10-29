import path from "node:path";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";

export async function loadFlatFile(artefactId: string, sourceArtefactId: string | null): Promise<FlatFile | null> {
  const extension = path.extname(sourceArtefactId ?? "");
  const fileName = `${artefactId}${extension}`;

  // New blobs are stored as the bare artefactId; older blobs have the upload extension appended
  const buffer = (await downloadBlob(artefactId, CONTAINER.ARTEFACT)) ?? (extension ? await downloadBlob(fileName, CONTAINER.ARTEFACT) : null);
  if (!buffer) {
    return null;
  }

  return { buffer, fileName };
}

export interface FlatFile {
  buffer: Buffer;
  fileName: string;
}
