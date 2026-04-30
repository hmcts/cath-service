import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./media-applications.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    mediaApplication: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("media-applications routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return all media applications when no query params", async () => {
      // Arrange
      const mockApplications = [{ id: "1", name: "Test User", email: "test@example.com" }];
      vi.mocked(prisma.mediaApplication.findMany).mockResolvedValue(mockApplications as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockApplications);
    });

    it("should return media application by email", async () => {
      // Arrange
      mockRequest.query = { email: "test@example.com" };
      const mockApplication = { id: "1", name: "Test User", email: "test@example.com" };
      vi.mocked(prisma.mediaApplication.findFirst).mockResolvedValue(mockApplication as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.findFirst).toHaveBeenCalledWith({
        where: { email: "test@example.com" }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockApplication);
    });

    it("should return 404 when media application not found by email", async () => {
      // Arrange
      mockRequest.query = { email: "notfound@example.com" };
      vi.mocked(prisma.mediaApplication.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Media application not found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch media applications" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create media application with required fields", async () => {
      // Arrange
      mockRequest.body = {
        name: "Test User",
        email: "test@example.com",
        employer: "Test Company"
      };
      const mockApplication = {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        employer: "Test Company",
        status: "PENDING",
        proofOfIdPath: null
      };
      vi.mocked(prisma.mediaApplication.create).mockResolvedValue(mockApplication as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockApplication);
    });

    it("should create media application with optional fields", async () => {
      // Arrange
      mockRequest.body = {
        name: "Test User",
        email: "test@example.com",
        employer: "Test Company",
        status: "APPROVED",
        proofOfIdPath: "/path/to/proof.pdf"
      };
      vi.mocked(prisma.mediaApplication.create).mockResolvedValue({
        id: "1",
        ...mockRequest.body
      } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.create).toHaveBeenCalledWith({
        data: {
          name: "Test User",
          email: "test@example.com",
          employer: "Test Company",
          status: "APPROVED",
          proofOfIdPath: "/path/to/proof.pdf"
        }
      });
    });

    it("should return 400 when name is missing", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", employer: "Test Company" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "name, email, and employer are required"
      });
    });

    it("should return 400 when email is missing", async () => {
      // Arrange
      mockRequest.body = { name: "Test User", employer: "Test Company" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when employer is missing", async () => {
      // Arrange
      mockRequest.body = { name: "Test User", email: "test@example.com" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = {
        name: "Test User",
        email: "test@example.com",
        employer: "Test Company"
      };
      vi.mocked(prisma.mediaApplication.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create media application" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
