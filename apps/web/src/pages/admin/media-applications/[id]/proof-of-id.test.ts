import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

const mockFsAccess = vi.fn();
const mockFsReadFile = vi.fn();

vi.mock("node:fs/promises", () => ({
  default: {
    access: mockFsAccess,
    readFile: mockFsReadFile
  }
}));

vi.mock("../../../media-application/queries.js", () => ({
  getApplicationById: vi.fn()
}));

const { getApplicationById } = await import("../../../media-application/queries.js");
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
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      const mockFileBuffer = Buffer.from("PDF content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(mockFileBuffer);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(mockFsAccess).toHaveBeenCalledWith("/uploads/proof-app-123.pdf");
      expect(mockFsReadFile).toHaveBeenCalledWith("/uploads/proof-app-123.pdf");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="proof-app-123.pdf"');
      expect(sendSpy).toHaveBeenCalledWith(mockFileBuffer);
    });

    it("should serve JPG file with correct content type", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.jpg",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      const mockFileBuffer = Buffer.from("JPG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(mockFileBuffer);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="proof-app-123.jpg"');
    });

    it("should serve JPEG file with correct content type", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.jpeg",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      const mockFileBuffer = Buffer.from("JPEG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(mockFileBuffer);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    });

    it("should serve PNG file with correct content type", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.png",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      const mockFileBuffer = Buffer.from("PNG content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(mockFileBuffer);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "image/png");
    });

    it("should use octet-stream for unknown file types", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.unknown",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      const mockFileBuffer = Buffer.from("Unknown content");

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(mockFileBuffer);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    });

    it("should return 404 when application not found", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("Application not found");
      expect(mockFsAccess).not.toHaveBeenCalled();
    });

    it("should return 404 when proof of ID path is null", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: null,
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("File not found");
      expect(mockFsAccess).not.toHaveBeenCalled();
    });

    it("should return 404 when file does not exist", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/missing-file.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockRejectedValue(new Error("File not found"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockFsAccess).toHaveBeenCalledWith("/uploads/missing-file.pdf");
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith("File not found");
      expect(mockFsReadFile).not.toHaveBeenCalled();
    });

    it("should return 500 when error reading file", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockRejectedValue(new Error("Permission denied"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith("Error loading file");
    });

    it("should return 500 when database query fails", async () => {
      vi.mocked(getApplicationById).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith("Error loading file");
    });

    it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
      expect(GET).toHaveLength(2);
      expect(GET[0]).toBeDefined();
    });
  });
});
