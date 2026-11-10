import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, RestError } from "@azure/storage-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openBlobContainer } from "./blob-container.js";

vi.mock("@azure/identity", () => ({ DefaultAzureCredential: vi.fn() }));
vi.mock("@azure/storage-blob", () => {
  class FakeRestError extends Error {
    statusCode: number;
    constructor(message: string, options: { statusCode: number }) {
      super(message);
      this.statusCode = options.statusCode;
    }
  }
  const BlobServiceClient = vi.fn();
  Object.assign(BlobServiceClient, { fromConnectionString: vi.fn() });
  return { BlobServiceClient, RestError: FakeRestError };
});

const blobClient = { downloadToBuffer: vi.fn(), downloadToFile: vi.fn(), getProperties: vi.fn() };
const blockBlobClient = { uploadData: vi.fn(), uploadFile: vi.fn() };
const containerClient = {
  getBlobClient: vi.fn(() => blobClient),
  getBlockBlobClient: vi.fn(() => blockBlobClient),
  listBlobsFlat: vi.fn()
};
const serviceClient = { getContainerClient: vi.fn(() => containerClient) };

function restError(statusCode: number): Error {
  return new (RestError as unknown as new (message: string, options: { statusCode: number }) => Error)(`status ${statusCode}`, { statusCode });
}

describe("openBlobContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue(serviceClient as never);
    // Constructed with new, so the implementations are classes
    vi.mocked(BlobServiceClient).mockImplementation(
      class {
        getContainerClient = serviceClient.getContainerClient;
      } as never
    );
    vi.mocked(DefaultAzureCredential).mockImplementation(
      class {
        kind = "credential";
      } as never
    );
  });

  it("should connect by connection string when one is given", () => {
    // Act
    const container = openBlobContainer({ connectionString: "UseDevelopmentStorage=true", container: "publications" });

    // Assert
    expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith("UseDevelopmentStorage=true");
    expect(BlobServiceClient).not.toHaveBeenCalled();
    expect(serviceClient.getContainerClient).toHaveBeenCalledWith("publications");
    expect(container.name).toBe("connection string/publications");
  });

  it("should connect to the account with an Azure identity when there is no connection string", () => {
    // Act
    const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

    // Assert
    expect(BlobServiceClient).toHaveBeenCalledWith("https://pipsa.blob.core.windows.net", expect.objectContaining({ kind: "credential" }));
    expect(BlobServiceClient.fromConnectionString).not.toHaveBeenCalled();
    expect(container.name).toBe("pipsa/publications");
  });

  it("should use the pod's managed identity when MANAGED_IDENTITY_CLIENT_ID is set", () => {
    // Arrange
    vi.stubEnv("MANAGED_IDENTITY_CLIENT_ID", "client-id-123");

    // Act
    openBlobContainer({ accountName: "pipsa", container: "publications" });

    // Assert
    expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: "client-id-123" });
    vi.unstubAllEnvs();
  });

  describe("download", () => {
    it("should return the blob's contents when it exists", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockResolvedValue(Buffer.from("pdf"));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const data = await container.download("a1.pdf");

      // Assert
      expect(containerClient.getBlobClient).toHaveBeenCalledWith("a1.pdf");
      expect(data?.toString()).toBe("pdf");
    });

    it("should return null when the blob does not exist", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockRejectedValue(restError(404));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const data = await container.download("missing.pdf");

      // Assert
      expect(data).toBeNull();
    });

    it("should explain the role needed when access is forbidden", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockRejectedValue(restError(403));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const download = container.download("a1.pdf");

      // Assert
      await expect(download).rejects.toThrow("cannot read pipsa/publications: the signed-in identity needs the Storage Blob Data Reader role");
    });

    it("should name the storage account generically when access is forbidden through a connection string", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockRejectedValue(restError(403));
      const container = openBlobContainer({ connectionString: "x", container: "publications" });

      // Act
      const download = container.download("a1.pdf");

      // Assert
      await expect(download).rejects.toThrow("cannot read the storage account/publications");
    });

    it("should rethrow any other error", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockRejectedValue(restError(500));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const download = container.download("a1.pdf");

      // Assert
      await expect(download).rejects.toThrow("status 500");
    });

    it("should rethrow an error that is not from storage", async () => {
      // Arrange
      blobClient.downloadToBuffer.mockRejectedValue(new Error("socket hang up"));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const download = container.download("a1.pdf");

      // Assert
      await expect(download).rejects.toThrow("socket hang up");
    });
  });

  describe("size", () => {
    it("should give the blob's size from its properties, without downloading it", async () => {
      // Arrange
      blobClient.getProperties.mockResolvedValue({ contentLength: 1234 });
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const size = await container.size("a1.pdf");

      // Assert
      expect(size).toBe(1234);
      expect(blobClient.downloadToBuffer).not.toHaveBeenCalled();
    });

    it("should give null when the blob does not exist", async () => {
      // Arrange
      blobClient.getProperties.mockRejectedValue(restError(404));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const size = await container.size("a1.pdf");

      // Assert
      expect(size).toBeNull();
    });

    it("should rethrow any other error", async () => {
      // Arrange
      blobClient.getProperties.mockRejectedValue(restError(500));
      const container = openBlobContainer({ accountName: "pipsa", container: "publications" });

      // Act
      const size = container.size("a1.pdf");

      // Assert
      await expect(size).rejects.toThrow("status 500");
    });
  });

  it("should upload data and files with their content type", async () => {
    // Arrange
    const container = openBlobContainer({ accountName: "pipsa", container: "baselines" });

    // Act
    await container.upload("a.json", Buffer.from("{}"), "application/json");
    await container.uploadFile("run.tar.gz", "/tmp/run.tar.gz", "application/gzip");

    // Assert
    expect(containerClient.getBlockBlobClient).toHaveBeenCalledWith("a.json");
    expect(blockBlobClient.uploadData).toHaveBeenCalledWith(Buffer.from("{}"), { blobHTTPHeaders: { blobContentType: "application/json" } });
    expect(blockBlobClient.uploadFile).toHaveBeenCalledWith("/tmp/run.tar.gz", { blobHTTPHeaders: { blobContentType: "application/gzip" } });
  });

  it("should download a blob to a file", async () => {
    // Arrange
    const container = openBlobContainer({ accountName: "pipsa", container: "baselines" });

    // Act
    await container.downloadToFile("run.tar.gz", "/tmp/run.tar.gz");

    // Assert
    expect(containerClient.getBlobClient).toHaveBeenCalledWith("run.tar.gz");
    expect(blobClient.downloadToFile).toHaveBeenCalledWith("/tmp/run.tar.gz");
  });

  it("should list the names of the blobs under a prefix", async () => {
    // Arrange
    containerClient.listBlobsFlat.mockImplementation(async function* () {
      yield { name: "runs/1.tar.gz" };
      yield { name: "runs/2.tar.gz" };
    });
    const container = openBlobContainer({ accountName: "pipsa", container: "baselines" });

    // Act
    const names = await container.list("runs/");

    // Assert
    expect(containerClient.listBlobsFlat).toHaveBeenCalledWith({ prefix: "runs/" });
    expect(names).toEqual(["runs/1.tar.gz", "runs/2.tar.gz"]);
  });
});
