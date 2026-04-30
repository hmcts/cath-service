import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./third-party-users.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartyUser: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("third-party-users routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return all third party users", async () => {
      // Arrange
      const mockUsers = [
        { id: "user1", name: "Test Corp", createdAt: new Date(), _count: { subscriptions: 2 } },
        { id: "user2", name: "Another Corp", createdAt: new Date(), _count: { subscriptions: 0 } }
      ];
      vi.mocked(prisma.thirdPartyUser.findMany).mockResolvedValue(mockUsers as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.thirdPartyUser.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { subscriptions: true } } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.thirdPartyUser.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch third party users" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create a third party user", async () => {
      // Arrange
      mockRequest.body = { name: "New Corp" };
      const mockUser = { id: "user1", name: "New Corp", createdAt: new Date() };
      vi.mocked(prisma.thirdPartyUser.create).mockResolvedValue(mockUser as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.thirdPartyUser.create).toHaveBeenCalledWith({ data: { name: "New Corp" } });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: "user1",
        name: "New Corp",
        createdAt: mockUser.createdAt
      });
    });

    it("should return 400 when name is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "name is required" });
    });

    it("should return 400 when name is not a string", async () => {
      // Arrange
      mockRequest.body = { name: 123 };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "name is required" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { name: "New Corp" };
      vi.mocked(prisma.thirdPartyUser.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create third party user" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete third party users by ids", async () => {
      // Arrange
      mockRequest.body = { ids: ["user1", "user2"] };
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.thirdPartyUser.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["user1", "user2"] } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 2 });
    });

    it("should return 400 when ids is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "ids array is required" });
    });

    it("should return 400 when ids is not an array", async () => {
      // Arrange
      mockRequest.body = { ids: "not-array" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when ids array is empty", async () => {
      // Arrange
      mockRequest.body = { ids: [] };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { ids: ["user1"] };
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete third party users" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
