import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./notifications.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    notificationAuditLog: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("notifications routes", () => {
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
    it("should return 400 when neither publicationId nor subscriptionId is provided", async () => {
      // Arrange
      mockRequest.query = {};

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Either publicationId or subscriptionId query parameter is required"
      });
    });

    it("should return notifications by publicationId", async () => {
      // Arrange
      mockRequest.query = { publicationId: "pub123" };
      const mockNotifications = [{ id: "1", publicationId: "pub123" }];
      vi.mocked(prisma.notificationAuditLog.findMany).mockResolvedValue(mockNotifications as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.findMany).toHaveBeenCalledWith({
        where: { publicationId: "pub123" },
        orderBy: { createdAt: "asc" }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockNotifications);
    });

    it("should return notifications by subscriptionId", async () => {
      // Arrange
      mockRequest.query = { subscriptionId: "sub123" };
      const mockNotifications = [{ id: "1", subscriptionId: "sub123" }];
      vi.mocked(prisma.notificationAuditLog.findMany).mockResolvedValue(mockNotifications as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: "sub123" },
        orderBy: { createdAt: "asc" }
      });
    });

    it("should return notifications with both publicationId and subscriptionId", async () => {
      // Arrange
      mockRequest.query = { publicationId: "pub123", subscriptionId: "sub123" };
      vi.mocked(prisma.notificationAuditLog.findMany).mockResolvedValue([] as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.findMany).toHaveBeenCalledWith({
        where: { publicationId: "pub123", subscriptionId: "sub123" },
        orderBy: { createdAt: "asc" }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.query = { publicationId: "pub123" };
      vi.mocked(prisma.notificationAuditLog.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch notifications" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should return 400 when neither publicationIds nor subscriptionIds is provided", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Either publicationIds or subscriptionIds array is required"
      });
    });

    it("should delete notifications by publicationIds", async () => {
      // Arrange
      mockRequest.body = { publicationIds: ["pub1", "pub2"] };
      vi.mocked(prisma.notificationAuditLog.deleteMany).mockResolvedValue({ count: 5 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.deleteMany).toHaveBeenCalledWith({
        where: { publicationId: { in: ["pub1", "pub2"] } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 5 });
    });

    it("should delete notifications by subscriptionIds", async () => {
      // Arrange
      mockRequest.body = { subscriptionIds: ["sub1", "sub2"] };
      vi.mocked(prisma.notificationAuditLog.deleteMany).mockResolvedValue({ count: 3 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.deleteMany).toHaveBeenCalledWith({
        where: { subscriptionId: { in: ["sub1", "sub2"] } }
      });
    });

    it("should delete notifications with both publicationIds and subscriptionIds", async () => {
      // Arrange
      mockRequest.body = { publicationIds: ["pub1"], subscriptionIds: ["sub1"] };
      vi.mocked(prisma.notificationAuditLog.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          publicationId: { in: ["pub1"] },
          subscriptionId: { in: ["sub1"] }
        }
      });
    });

    it("should ignore empty arrays", async () => {
      // Arrange
      mockRequest.body = { publicationIds: [], subscriptionIds: ["sub1"] };
      vi.mocked(prisma.notificationAuditLog.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.notificationAuditLog.deleteMany).toHaveBeenCalledWith({
        where: { subscriptionId: { in: ["sub1"] } }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { publicationIds: ["pub1"] };
      vi.mocked(prisma.notificationAuditLog.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete notifications" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
