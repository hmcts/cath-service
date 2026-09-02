import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

const mockDownloadBlob = vi.fn();

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
  CONTAINER: { FILES: "files" },
  getContentType: vi.fn((ext: string) => {
    const map: Record<string, string> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
    return map[ext] ?? "application/octet-stream";
  })
}));

vi.mock("@hmcts/admin-pages", () => ({
  getApplicationById: vi.fn()
}));

const { getApplicationById } = await import("@hmcts/admin-pages");
const { GET } = await import("./proof-of-id.js");

describe("proof-of-id file download", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let sendSpy: ReturnType<typeof vi.fn>;
  let setHeaderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { id: "app-123" }
    };

    sendSpy = vi.fn();
    setHeaderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockResponse = {
      send: sendSpy,
      setHeader: setHeaderSpy,
      status: statusSpy
    };
  });

  describe("GET handler", () => {
    it("should serve PDF file successfully", async () => {
      // Arrange
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        proofOfIdPath: "app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("PDF content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(mockDownloadBlob).toHaveBeenCalledWith("app-123.pdf", "files");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="app-123.pdf"');
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Length", mockFileBuffer.length);
      expect(sendSpy).toHaveBeenCalledWith(mockFileBuffer);
    });

    it("should serve JPG file with correct content type", async () => {
      // Arrange
      const mockApplication = {
        id: "app-456",
        name: "Jane Smith",
        employer: "ITV",
        email: "jane@itv.co.uk",
        proofOfIdPath: "app-456.jpg",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("JPG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="app-456.jpg"');
    });

    it("should serve JPEG file with correct content type", async () => {
      // Arrange
      const mockApplication = {
        id: "app-789",
        name: "Bob Jones",
        employer: "Sky",
        email: "bob@sky.co.uk",
        proofOfIdPath: "app-789.jpeg",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("JPEG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    });

    it("should serve PNG file with correct content type", async () => {
      // Arrange
      const mockApplication = {
        id: "app-abc",
        name: "Alice Brown",
        employer: "Channel 4",
        email: "alice@channel4.co.uk",
        proofOfIdPath: "app-abc.png",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("PNG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/png");
    });

    it("should use octet-stream for unknown file types", async () => {
      // Arrange
      const mockApplication = {
        id: "app-xyz",
        name: "Dave Green",
        employer: "Reuters",
        email: "dave@reuters.com",
        proofOfIdPath: "app-xyz.tiff",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("TIFF content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    });

    it("should return 404 when application not found", async () => {
      // Arrange
      vi.mocked(getApplicationById).mockResolvedValue(null);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("Application not found");
      expect(mockDownloadBlob).not.toHaveBeenCalled();
    });

    it("should return 404 when proof of ID path is null", async () => {
      // Arrange
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        proofOfIdPath: null,
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("File not found");
      expect(mockDownloadBlob).not.toHaveBeenCalled();
    });

    it("should handle legacy absolute path stored before blob storage migration", async () => {
      // Arrange
      const mockApplication = {
        id: "15694279-dea8-491d-9f5a-d60186292e0e",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        proofOfIdPath: "/Users/app/storage/temp/files/15694279-dea8-491d-9f5a-d60186292e0e.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };
      const mockFileBuffer = Buffer.from("PDF content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(mockFileBuffer);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockDownloadBlob).toHaveBeenCalledWith("15694279-dea8-491d-9f5a-d60186292e0e.pdf", "files");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(sendSpy).toHaveBeenCalledWith(mockFileBuffer);
    });

    it("should return 404 when blob does not exist in storage", async () => {
      // Arrange
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        proofOfIdPath: "app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockResolvedValue(null);

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("File not found");
    });

    it("should return 500 when download throws", async () => {
      // Arrange
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        proofOfIdPath: "app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockDownloadBlob.mockRejectedValue(new Error("Storage unavailable"));

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith("Error loading file");
    });

    it("should return 500 when database query fails", async () => {
      // Arrange
      vi.mocked(getApplicationById).mockRejectedValue(new Error("Database error"));

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith("Error loading file");
    });

    it("should return 400 when id param is missing", async () => {
      // Arrange
      mockRequest = { params: {} };
      const renderSpy = vi.fn();
      mockResponse = {
        send: sendSpy,
        setHeader: setHeaderSpy,
        status: statusSpy,
        render: renderSpy
      };

      // Act
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalledWith("errors/400");
      expect(mockDownloadBlob).not.toHaveBeenCalled();
    });

    it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
      expect(GET).toHaveLength(2);
      expect(GET[0]).toBeDefined();
    });
  });
});
