import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./[id].js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartyUser: {
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("third-party-users/[id] routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: { id: "user1" },
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return a third party user with subscriptions", async () => {
      // Arrange
      const mockUser = {
        id: "user1",
        name: "Test Corp",
        createdAt: new Date(),
        subscriptions: [
          { id: "sub1", listType: "LIST_A", sensitivity: "PUBLIC" }
        ]
      };
      vi.mocked(prisma.thirdPartyUser.findUnique).mockResolvedValue(mockUser as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.thirdPartyUser.findUnique).toHaveBeenCalledWith({
        where: { id: "user1" },
        include: { subscriptions: true }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 when user not found", async () => {
      // Arrange
      vi.mocked(prisma.thirdPartyUser.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Third party user not found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.thirdPartyUser.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch third party user" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete a third party user", async () => {
      // Arrange
      vi.mocked(prisma.thirdPartyUser.delete).mockResolvedValue({ id: "user1" } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.thirdPartyUser.delete).toHaveBeenCalledWith({ where: { id: "user1" } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 404 when user not found", async () => {
      // Arrange
      const prismaError = new Error("Not found") as Error & { code?: string };
      prismaError.code = "P2025";
      vi.mocked(prisma.thirdPartyUser.delete).mockRejectedValue(prismaError);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Third party user not found" });
    });

    it("should return 500 on other database errors", async () => {
      // Arrange
      vi.mocked(prisma.thirdPartyUser.delete).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete third party user" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
