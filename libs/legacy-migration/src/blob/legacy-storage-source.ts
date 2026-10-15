import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

// Reads from the legacy CaTH storage account. Writes always go to this service's own storage
// through @hmcts/azure-blob, so nothing here can modify legacy data.
export function createLegacyStorageReader(): LegacyStorageReader {
  const client = createLegacyBlobServiceClient();

  return {
    async download(containerName, blobName) {
      try {
        return await client.getContainerClient(containerName).getBlobClient(blobName).downloadToBuffer();
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async exists(containerName, blobName) {
      return client.getContainerClient(containerName).getBlobClient(blobName).exists();
    }
  };
}

function createLegacyBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.LEGACY_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.LEGACY_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("LEGACY_STORAGE_CONNECTION_STRING or LEGACY_STORAGE_ACCOUNT_NAME is required");
  }

  const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID });
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "statusCode" in error && (error as { statusCode: number }).statusCode === 404;
}

export interface LegacyStorageReader {
  download(containerName: string, blobName: string): Promise<Buffer | null>;
  exists(containerName: string, blobName: string): Promise<boolean>;
}
