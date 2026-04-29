import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./[userId].js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("[userId] routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: { userId: "user123" }
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("DELETE", () => {
    it("should delete user and return 204", async () => {
      // Arrange
      vi.mocked(prisma.user.delete).mockResolvedValue({ userId: "user123" } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { userId: "user123" } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 400 when userId is missing", async () => {
      // Arrange
      mockRequest.params = { userId: "" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "userId is required" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.user.delete).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete test user" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
