import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./flat-files.js";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" },
  downloadBlob: vi.fn(),
  uploadBlob: vi.fn(),
  deleteBlob: vi.fn()
}));

import { deleteBlob, downloadBlob, uploadBlob } from "@hmcts/azure-blob";

describe("GET /test-support/flat-files", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it("should return exists true with file details when blob found", async () => {
    // Arrange
    mockRequest = { query: { artefactId: "test-artefact-id" } };
    const mockBuffer = Buffer.from("pdf content");
    vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);

    // Act
    await GET(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(downloadBlob).toHaveBeenCalledWith("test-artefact-id.pdf", "publications");
    expect(mockResponse.json).toHaveBeenCalledWith({
      exists: true,
      artefactId: "test-artefact-id",
      filename: "test-artefact-id.pdf",
      sizeBytes: mockBuffer.length
    });
  });

  it("should return exists false when blob not found", async () => {
    // Arrange
    mockRequest = { query: { artefactId: "missing-id" } };
    vi.mocked(downloadBlob).mockResolvedValue(null);

    // Act
    await GET(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith({ exists: false, artefactId: "missing-id" });
  });

  it("should return 400 when artefactId is missing", async () => {
    // Arrange
    mockRequest = { query: {} };

    // Act
    await GET(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "artefactId query parameter is required" });
  });

  it("should use custom extension when provided", async () => {
    // Arrange
    mockRequest = { query: { artefactId: "test-id", extension: ".json" } };
    vi.mocked(downloadBlob).mockResolvedValue(null);

    // Act
    await GET(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(downloadBlob).toHaveBeenCalledWith("test-id.json", "publications");
  });

  it("should return 500 when blob download throws", async () => {
    // Arrange
    mockRequest = { query: { artefactId: "test-id" } };
    vi.mocked(downloadBlob).mockRejectedValue(new Error("Storage error"));

    // Act
    await GET(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to check flat file" });
  });
});

describe("POST /test-support/flat-files", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it("should upload blob and return 201 with file details", async () => {
    // Arrange
    const content = Buffer.from("pdf content").toString("base64");
    mockRequest = { body: { artefactId: "test-id", content, extension: ".pdf" } };
    vi.mocked(uploadBlob).mockResolvedValue(undefined);

    // Act
    await POST(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith("test-id.pdf", expect.any(Buffer), "application/pdf", "artefact");
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-id", filename: "test-id.pdf" }));
  });

  it("should use default pdf extension when extension not provided", async () => {
    // Arrange
    const content = Buffer.from("pdf content").toString("base64");
    mockRequest = { body: { artefactId: "test-id", content } };
    vi.mocked(uploadBlob).mockResolvedValue(undefined);

    // Act
    await POST(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith("test-id.pdf", expect.any(Buffer), "application/pdf", "artefact");
  });

  it("should return 400 when artefactId is missing", async () => {
    // Arrange
    mockRequest = { body: { content: "c29tZS1jb250ZW50" } };

    // Act
    await POST(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "artefactId and content are required" });
  });

  it("should return 400 when content is missing", async () => {
    // Arrange
    mockRequest = { body: { artefactId: "test-id" } };

    // Act
    await POST(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "artefactId and content are required" });
  });

  it("should return 500 when upload throws", async () => {
    // Arrange
    const content = Buffer.from("pdf content").toString("base64");
    mockRequest = { body: { artefactId: "test-id", content } };
    vi.mocked(uploadBlob).mockRejectedValue(new Error("Storage error"));

    // Act
    await POST(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create flat file" });
  });
});

describe("DELETE /test-support/flat-files", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it("should delete blob and return success", async () => {
    // Arrange
    mockRequest = { body: { artefactId: "test-id" } };
    vi.mocked(deleteBlob).mockResolvedValue(undefined);

    // Act
    await DELETE(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(deleteBlob).toHaveBeenCalledWith("test-id.pdf", "artefact");
    expect(mockResponse.json).toHaveBeenCalledWith({ deleted: true });
  });

  it("should use custom extension when provided", async () => {
    // Arrange
    mockRequest = { body: { artefactId: "test-id", extension: ".json" } };
    vi.mocked(deleteBlob).mockResolvedValue(undefined);

    // Act
    await DELETE(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(deleteBlob).toHaveBeenCalledWith("test-id.json", "artefact");
  });

  it("should return 400 when artefactId is missing", async () => {
    // Arrange
    mockRequest = { body: {} };

    // Act
    await DELETE(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "artefactId is required" });
  });

  it("should return 500 when delete throws", async () => {
    // Arrange
    mockRequest = { body: { artefactId: "test-id" } };
    vi.mocked(deleteBlob).mockRejectedValue(new Error("Storage error"));

    // Act
    await DELETE(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete flat file" });
  });
});
