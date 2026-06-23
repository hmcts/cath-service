import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const CONTAINER_NAME = "artefact";

function createBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required when AZURE_STORAGE_CONNECTION_STRING is not set");
  }

  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID
  });
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

export async function uploadBlob(blobName: string, buffer: Buffer, contentType?: string): Promise<void> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined
  });
}

export async function downloadBlob(blobName: string): Promise<Buffer | null> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(blobName);

  try {
    const downloadResponse = await blobClient.download();
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error && (error as { statusCode: number }).statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteBlob(blobName: string): Promise<void> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(blobName);

  try {
    await blobClient.delete();
  } catch (error) {
    if (error instanceof Error && "statusCode" in error && (error as { statusCode: number }).statusCode === 404) {
      return;
    }
    throw error;
  }
}
