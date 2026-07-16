import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

export const CONTAINER = {
  ARTEFACT: "artefact",
  FILES: "files",
  PUBLICATIONS: "publications"
} as const;

export type ContainerName = (typeof CONTAINER)[keyof typeof CONTAINER];

function createBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required when AZURE_STORAGE_CONNECTION_STRING is not set");
  }

  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  }

  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID
  });
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

export async function uploadBlob(blobName: string, buffer: Buffer, contentType?: string, containerName: ContainerName = CONTAINER.ARTEFACT): Promise<void> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined
  });
}

export async function downloadBlob(blobName: string, containerName: ContainerName = CONTAINER.ARTEFACT): Promise<Buffer | null> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
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

export async function getBlobProperties(blobName: string, containerName: ContainerName = CONTAINER.ARTEFACT): Promise<{ size: number } | null> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  try {
    const properties = await blobClient.getProperties();
    return { size: properties.contentLength ?? 0 };
  } catch (error) {
    if (error instanceof Error && "statusCode" in error && (error as { statusCode: number }).statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteBlob(blobName: string, containerName: ContainerName = CONTAINER.ARTEFACT): Promise<void> {
  const client = createBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
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
