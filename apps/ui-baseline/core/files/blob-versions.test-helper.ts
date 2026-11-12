import { createHash } from "node:crypto";
import type { BlobContainer } from "./blob-container.js";

// Gives an in-memory blob container used in tests the conditional reads and writes Azure has: a
// blob's ETag is a hash of what it holds, so a write since it was read changes it. Conditional
// writes are made one at a time, as Azure checks and writes in one step, so two pods racing to
// claim the same run cannot both win.
export function withVersions<T extends Pick<BlobContainer, "download" | "upload">>(
  store: T
): T & Pick<BlobContainer, "downloadVersioned" | "uploadIfUnchanged"> {
  const etagOf = (data: Buffer) => createHash("sha256").update(data).digest("hex");
  let writing: Promise<unknown> = Promise.resolve();
  return {
    ...store,
    async downloadVersioned(blobName: string) {
      const data = await store.download(blobName);
      return data ? { data, etag: etagOf(data) } : null;
    },
    uploadIfUnchanged(blobName: string, data: Buffer, contentType: string, etag: string) {
      const write = writing.then(async () => {
        const current = await store.download(blobName);
        if (!current || etagOf(current) !== etag) return false;
        await store.upload(blobName, data, contentType);
        return true;
      });
      writing = write.catch(() => undefined);
      return write;
    }
  };
}
