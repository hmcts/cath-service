import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUploadData = vi.fn();
const mockDownload = vi.fn();
const mockDelete = vi.fn();
const mockCreateIfNotExists = vi.fn();
const mockGetBlockBlobClient = vi.fn(() => ({ uploadData: mockUploadData }));
const mockGetBlobClient = vi.fn(() => ({ download: mockDownload, delete: mockDelete }));
const mockGetContainerClient = vi.fn(() => ({
  createIfNotExists: mockCreateIfNotExists,
  getBlockBlobClient: mockGetBlockBlobClient,
  getBlobClient: mockGetBlobClient
}));
const mockFromConnectionString = vi.fn(() => ({ getContainerClient: mockGetContainerClient }));

vi.mock("@azure/storage-blob", () => {
  function MockBlobServiceClient() {
    return { getContainerClient: mockGetContainerClient };
  }
  MockBlobServiceClient.fromConnectionString = mockFromConnectionString;
  return { BlobServiceClient: MockBlobServiceClient };
});

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn()
}));

describe("blob-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("uploadBlob", () => {
    it("should upload JSON blob using connection string", async () => {
      // Arrange
      vi.stubEnv(
        "AZURE_STORAGE_CONNECTION_STRING",
        "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=test==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
      );
      mockCreateIfNotExists.mockResolvedValue({});
      mockUploadData.mockResolvedValue({});
      const { uploadBlob } = await import("./blob-client.js");

      // Act
      await uploadBlob("abc123.json", Buffer.from('{"key":"value"}'), "application/json");

      // Assert
      expect(mockFromConnectionString).toHaveBeenCalledTimes(1);
      expect(mockCreateIfNotExists).toHaveBeenCalledTimes(1);
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("abc123.json");
      expect(mockUploadData).toHaveBeenCalledWith(Buffer.from('{"key":"value"}'), { blobHTTPHeaders: { blobContentType: "application/json" } });
    });

    it("should upload flat file blob using connection string", async () => {
      // Arrange
      vi.stubEnv(
        "AZURE_STORAGE_CONNECTION_STRING",
        "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=test==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
      );
      mockCreateIfNotExists.mockResolvedValue({});
      mockUploadData.mockResolvedValue({});
      const { uploadBlob } = await import("./blob-client.js");

      // Act
      await uploadBlob("abc123.pdf", Buffer.from("pdf-content"), "application/pdf");

      // Assert
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("abc123.pdf");
      expect(mockUploadData).toHaveBeenCalledWith(Buffer.from("pdf-content"), { blobHTTPHeaders: { blobContentType: "application/pdf" } });
    });

    it("should upload blob without content type", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      mockCreateIfNotExists.mockResolvedValue({});
      mockUploadData.mockResolvedValue({});
      const { uploadBlob } = await import("./blob-client.js");

      // Act
      await uploadBlob("abc123.bin", Buffer.from("data"));

      // Assert
      expect(mockUploadData).toHaveBeenCalledWith(Buffer.from("data"), { blobHTTPHeaders: undefined });
    });

    it("should use DefaultAzureCredential when connection string is not set", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "");
      vi.stubEnv("AZURE_STORAGE_ACCOUNT_NAME", "myaccount");
      vi.stubEnv("MANAGED_IDENTITY_CLIENT_ID", "client-id-123");
      mockCreateIfNotExists.mockResolvedValue({});
      mockUploadData.mockResolvedValue({});
      const { uploadBlob } = await import("./blob-client.js");
      const { DefaultAzureCredential } = await import("@azure/identity");

      // Act
      await uploadBlob("abc123.json", Buffer.from("{}"));

      // Assert
      expect(mockFromConnectionString).not.toHaveBeenCalled();
      expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: "client-id-123" });
    });

    it("should throw when neither connection string nor account name is set", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "");
      vi.stubEnv("AZURE_STORAGE_ACCOUNT_NAME", "");
      const { uploadBlob } = await import("./blob-client.js");

      // Act & Assert
      await expect(uploadBlob("abc.json", Buffer.from("{}"))).rejects.toThrow(
        "AZURE_STORAGE_ACCOUNT_NAME is required when AZURE_STORAGE_CONNECTION_STRING is not set"
      );
    });
  });

  describe("downloadBlob", () => {
    it("should return Buffer when blob is found", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      const mockStream = (async function* () {
        yield Buffer.from("hello ");
        yield Buffer.from("world");
      })();
      mockDownload.mockResolvedValue({ readableStreamBody: mockStream });
      const { downloadBlob } = await import("./blob-client.js");

      // Act
      const result = await downloadBlob("abc123.pdf");

      // Assert
      expect(result).toEqual(Buffer.from("hello world"));
      expect(mockGetBlobClient).toHaveBeenCalledWith("abc123.pdf");
    });

    it("should return null when blob is not found (404)", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      const notFoundError = Object.assign(new Error("BlobNotFound"), { statusCode: 404 });
      mockDownload.mockRejectedValue(notFoundError);
      const { downloadBlob } = await import("./blob-client.js");

      // Act
      const result = await downloadBlob("missing.pdf");

      // Assert
      expect(result).toBeNull();
    });

    it("should propagate non-404 errors", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      const serverError = Object.assign(new Error("Server error"), { statusCode: 500 });
      mockDownload.mockRejectedValue(serverError);
      const { downloadBlob } = await import("./blob-client.js");

      // Act & Assert
      await expect(downloadBlob("abc123.pdf")).rejects.toThrow("Server error");
    });
  });

  describe("deleteBlob", () => {
    it("should delete blob when it exists", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      mockDelete.mockResolvedValue({});
      const { deleteBlob } = await import("./blob-client.js");

      // Act
      await deleteBlob("abc123.pdf");

      // Assert
      expect(mockGetBlobClient).toHaveBeenCalledWith("abc123.pdf");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("should swallow 404 when blob does not exist", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      const notFoundError = Object.assign(new Error("BlobNotFound"), { statusCode: 404 });
      mockDelete.mockRejectedValue(notFoundError);
      const { deleteBlob } = await import("./blob-client.js");

      // Act & Assert
      await expect(deleteBlob("missing.pdf")).resolves.toBeUndefined();
    });

    it("should propagate non-404 errors", async () => {
      // Arrange
      vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "conn-string");
      const serverError = Object.assign(new Error("Storage error"), { statusCode: 500 });
      mockDelete.mockRejectedValue(serverError);
      const { deleteBlob } = await import("./blob-client.js");

      // Act & Assert
      await expect(deleteBlob("abc123.pdf")).rejects.toThrow("Storage error");
    });
  });
});
