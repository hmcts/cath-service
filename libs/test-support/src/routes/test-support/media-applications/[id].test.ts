import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./[id].js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    mediaApplication: {
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("[id] media-applications routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: { id: "app123" }
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return media application when found", async () => {
      // Arrange
      const mockApplication = { id: "app123", name: "Test User", email: "test@example.com" };
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(mockApplication as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.findUnique).toHaveBeenCalledWith({ where: { id: "app123" } });
      expect(mockResponse.json).toHaveBeenCalledWith(mockApplication);
    });

    it("should return 404 when media application not found", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Media application not found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch media application" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete media application and return 204", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.delete).mockResolvedValue({ id: "app123" } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.mediaApplication.delete).toHaveBeenCalledWith({ where: { id: "app123" } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.delete).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete media application" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
