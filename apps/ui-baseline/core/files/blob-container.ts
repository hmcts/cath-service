import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, RestError } from "@azure/storage-blob";

// Read access to one blob container, by connection string (Azurite, or a key from a vault) or by
// account name with an Azure identity (a pod's managed identity, or `az login` on a laptop)
export function openBlobContainer(storage: StorageSpec): BlobContainer {
  const service = storage.connectionString
    ? BlobServiceClient.fromConnectionString(storage.connectionString)
    : new BlobServiceClient(
        `https://${storage.accountName}.blob.core.windows.net`,
        new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID })
      );
  const container = service.getContainerClient(storage.container);
  return {
    name: `${storage.accountName ?? "connection string"}/${storage.container}`,
    async download(blobName) {
      try {
        return await container.getBlobClient(blobName).downloadToBuffer();
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 404) return null;
        if (error instanceof RestError && error.statusCode === 403)
          throw new Error(
            `cannot read ${storage.accountName ?? "the storage account"}/${storage.container}: the signed-in identity needs the Storage Blob Data Reader role on it, or use a connection string instead`
          );
        throw error;
      }
    },
    // The blob's size from its properties, without downloading it; null when there is no such blob
    async size(blobName) {
      try {
        return (await container.getBlobClient(blobName).getProperties()).contentLength ?? null;
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 404) return null;
        throw error;
      }
    },
    // The blob with its ETag, for a write that must not overwrite someone else's (uploadIfUnchanged)
    async downloadVersioned(blobName) {
      try {
        const response = await container.getBlobClient(blobName).download();
        const chunks: Buffer[] = [];
        for await (const chunk of response.readableStreamBody ?? []) chunks.push(Buffer.from(chunk as Buffer));
        return { data: Buffer.concat(chunks), etag: response.etag as string };
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 404) return null;
        throw error;
      }
    },
    async upload(blobName, data, contentType) {
      await container.getBlockBlobClient(blobName).uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
    },
    // Writes the blob only if it is still as it was read (its ETag); false when it was written since
    async uploadIfUnchanged(blobName, data, contentType, etag) {
      try {
        await container.getBlockBlobClient(blobName).uploadData(data, { blobHTTPHeaders: { blobContentType: contentType }, conditions: { ifMatch: etag } });
        return true;
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 412) return false;
        throw error;
      }
    },
    // Large files (a recorded baseline) are streamed rather than held in memory
    async uploadFile(blobName, file, contentType) {
      await container.getBlockBlobClient(blobName).uploadFile(file, { blobHTTPHeaders: { blobContentType: contentType } });
    },
    async downloadToFile(blobName, file) {
      await container.getBlobClient(blobName).downloadToFile(file);
    },
    async list(prefix) {
      const names: string[] = [];
      for await (const blob of container.listBlobsFlat({ prefix })) names.push(blob.name);
      return names;
    }
  };
}

export interface StorageSpec {
  connectionString?: string;
  accountName?: string;
  container: string;
}

export interface BlobContainer {
  name: string;
  download(blobName: string): Promise<Buffer | null>;
  downloadVersioned(blobName: string): Promise<{ data: Buffer; etag: string } | null>;
  size(blobName: string): Promise<number | null>;
  upload(blobName: string, data: Buffer, contentType: string): Promise<void>;
  uploadIfUnchanged(blobName: string, data: Buffer, contentType: string, etag: string): Promise<boolean>;
  uploadFile(blobName: string, file: string, contentType: string): Promise<void>;
  downloadToFile(blobName: string, file: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
