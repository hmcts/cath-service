import type { Response } from "express";
import type { PendingFileReference } from "./model.js";
import { getPendingFile, type PendingFilePrefix } from "./storage.js";

// Only the file referenced by the caller's own session is served, so one user can never fetch another's upload.
export async function sendPendingFile(res: Response, prefix: PendingFilePrefix, reference: PendingFileReference | undefined): Promise<void> {
  const file = reference ? await getPendingFile(prefix, reference.id) : null;

  if (!file) {
    res.status(404).end();
    return;
  }

  res.set({ "Content-Type": file.mimetype, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.send(file.buffer);
}
