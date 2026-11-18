import { CONTAINER, deleteBlob, getBlobProperties } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./proof-of-id.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    mediaApplication: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { ARTEFACT: "artefact", FILES: "files", PUBLICATIONS: "publications" },
  deleteBlob: vi.fn(),
  getBlobProperties: vi.fn()
}));

describe("media-applications/[id]/proof-of-id routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = { params: { id: "app123" } };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should report the blob size when the proof of ID file exists", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: "app123.pdf" } as any);
      vi.mocked(getBlobProperties).mockResolvedValue({ size: 21 });

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.findUnique).toHaveBeenCalledWith({ where: { id: "app123" }, select: { proofOfIdPath: true } });
      expect(getBlobProperties).toHaveBeenCalledWith("app123.pdf", CONTAINER.FILES);
      expect(mockResponse.json).toHaveBeenCalledWith({ exists: true, blobName: "app123.pdf", sizeBytes: 21 });
    });

    it("should report exists false when the blob is missing", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: "app123.pdf" } as any);
      vi.mocked(getBlobProperties).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({ exists: false, blobName: "app123.pdf" });
    });

    it("should report exists false without a blob lookup when no proof of ID was recorded", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: null } as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(getBlobProperties).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ exists: false });
    });

    it("should return 400 when the id is missing", async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(prisma.mediaApplication.findUnique).not.toHaveBeenCalled();
    });

    it("should return 404 when the media application does not exist", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Media application not found" });
    });

    it("should return 500 when blob storage fails", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: "app123.pdf" } as any);
      vi.mocked(getBlobProperties).mockRejectedValue(new Error("Blob error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to check proof of ID file" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete the proof of ID blob and return 204", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: "app123.pdf" } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(deleteBlob).toHaveBeenCalledWith("app123.pdf", CONTAINER.FILES);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 204 without deleting when no proof of ID was recorded", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: null } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(deleteBlob).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it("should return 404 when the media application does not exist", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(null);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(deleteBlob).not.toHaveBeenCalled();
    });

    it("should return 500 when blob deletion fails", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue({ proofOfIdPath: "app123.pdf" } as any);
      vi.mocked(deleteBlob).mockRejectedValue(new Error("Blob error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete proof of ID file" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
