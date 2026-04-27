import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./subscriptions.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("subscriptions routes", () => {
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
    it("should return all subscriptions when no query params", async () => {
      // Arrange
      const mockSubscriptions = [{ subscriptionId: "sub1", userId: "user1" }];
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({ where: {} });
      expect(mockResponse.json).toHaveBeenCalledWith(mockSubscriptions);
    });

    it("should filter by userId", async () => {
      // Arrange
      mockRequest.query = { userId: "user1" };
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({ where: { userId: "user1" } });
    });

    it("should filter by searchType", async () => {
      // Arrange
      mockRequest.query = { searchType: "LOCATION_ID" };
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({ where: { searchType: "LOCATION_ID" } });
    });

    it("should filter by searchValue", async () => {
      // Arrange
      mockRequest.query = { searchValue: "123" };
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({ where: { searchValue: "123" } });
    });

    it("should filter by multiple params", async () => {
      // Arrange
      mockRequest.query = { userId: "user1", searchType: "LOCATION_ID", searchValue: "123" };
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: "user1", searchType: "LOCATION_ID", searchValue: "123" }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch subscriptions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create subscription", async () => {
      // Arrange
      mockRequest.body = {
        userId: "user1",
        searchType: "LOCATION_ID",
        searchValue: "123"
      };
      const mockSubscription = {
        subscriptionId: "sub1",
        userId: "user1",
        searchType: "LOCATION_ID",
        searchValue: "123"
      };
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        subscriptionId: "sub1",
        userId: "user1",
        searchType: "LOCATION_ID",
        searchValue: "123"
      });
    });

    it("should return 400 when userId is missing", async () => {
      // Arrange
      mockRequest.body = { searchType: "LOCATION_ID", searchValue: "123" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "userId, searchType, and searchValue are required"
      });
    });

    it("should return 400 when searchType is missing", async () => {
      // Arrange
      mockRequest.body = { userId: "user1", searchValue: "123" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when searchValue is missing", async () => {
      // Arrange
      mockRequest.body = { userId: "user1", searchType: "LOCATION_ID" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { userId: "user1", searchType: "LOCATION_ID", searchValue: "123" };
      vi.mocked(prisma.subscription.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create test subscription" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete subscriptions with filters", async () => {
      // Arrange
      mockRequest.body = { userId: "user1", searchType: "LOCATION_ID", searchValues: ["123", "456"] };
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          searchType: "LOCATION_ID",
          searchValue: { in: ["123", "456"] }
        }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 2 });
    });

    it("should delete with partial filters", async () => {
      // Arrange
      mockRequest.body = { userId: "user1" };
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 5 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user1" }
      });
    });

    it("should delete with empty body", async () => {
      // Arrange
      mockRequest.body = {};
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({ where: {} });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { userId: "user1" };
      vi.mocked(prisma.subscription.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete subscriptions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
