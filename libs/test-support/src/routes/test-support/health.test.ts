import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./health.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $connect: vi.fn(),
    jurisdiction: {
      findMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("health routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {};
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return healthy status when database is connected and migrations are complete", async () => {
      // Arrange
      vi.mocked(prisma.$connect).mockResolvedValue(undefined);
      vi.mocked((prisma as any).jurisdiction.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "healthy",
        database: "connected",
        migrations: "complete"
      });
    });

    it("should return 503 when migrations are pending", async () => {
      // Arrange
      vi.mocked(prisma.$connect).mockResolvedValue(undefined);
      vi.mocked((prisma as any).jurisdiction.findMany).mockRejectedValue(new Error("Table does not exist"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "unhealthy",
        database: "connected",
        migrations: "pending",
        error: "Database migrations not yet applied"
      });
    });

    it("should return 503 when database connection fails", async () => {
      // Arrange
      vi.mocked(prisma.$connect).mockRejectedValue(new Error("Connection refused"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "unhealthy",
        database: "disconnected",
        migrations: "unknown",
        error: "Connection refused"
      });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should handle non-Error objects in catch block", async () => {
      // Arrange
      vi.mocked(prisma.$connect).mockRejectedValue("String error");

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "unhealthy",
        database: "disconnected",
        migrations: "unknown",
        error: "Unknown error"
      });
    });
  });
});
