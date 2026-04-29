import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./[locationId].js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("[locationId] routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: { locationId: "123" }
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("DELETE", () => {
    it("should delete location and return 204", async () => {
      // Arrange
      vi.mocked(prisma.location.delete).mockResolvedValue({ locationId: 123 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.delete).toHaveBeenCalledWith({ where: { locationId: 123 } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 400 when locationId is invalid", async () => {
      // Arrange
      mockRequest.params = { locationId: "invalid" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid locationId" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.location.delete).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete test location" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
