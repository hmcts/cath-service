import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./cleanup.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    artefact: {
      deleteMany: vi.fn()
    },
    user: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    subscription: {
      deleteMany: vi.fn()
    },
    listType: {
      deleteMany: vi.fn()
    },
    mediaApplication: {
      deleteMany: vi.fn()
    },
    thirdPartyUser: {
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("cleanup routes", () => {
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

  describe("DELETE", () => {
    it("should return 400 when prefix is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "prefix is required" });
    });

    it("should return 400 when prefix is not a string", async () => {
      // Arrange
      mockRequest.body = { prefix: 123 };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "prefix is required" });
    });

    it("should return 400 when prefix is less than 5 characters", async () => {
      // Arrange
      mockRequest.body = { prefix: "test" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "prefix must be at least 5 characters to prevent accidental deletion"
      });
    });

    it("should cleanup test data with valid prefix", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 1 }, { locationId: 2 }] as any);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 3 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ userId: "user1" }] as any);
      vi.mocked(prisma.subscription.deleteMany)
        .mockResolvedValueOnce({ count: 2 } as any) // user subscriptions
        .mockResolvedValueOnce({ count: 1 } as any) // subscriptions by searchValue prefix
        .mockResolvedValueOnce({ count: 1 } as any); // subscriptions by LOCATION_ID
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        prefix: "test_",
        deleted: 12,
        details: {
          artefacts: 3,
          subscriptions: 4,
          users: 1,
          locations: 2,
          listTypes: 1,
          mediaApplications: 1,
          thirdPartyUsers: 1
        }
      });
    });

    it("should handle empty test locations", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        prefix: "test_prefix",
        deleted: 0,
        details: {
          artefacts: 0,
          subscriptions: 0,
          users: 0,
          locations: 0,
          listTypes: 0,
          mediaApplications: 0,
          thirdPartyUsers: 0
        }
      });
    });

    it("should handle empty test users", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            subscriptions: 0,
            thirdPartyUsers: 0
          })
        })
      );
    });

    it("should cleanup third party users with both underscore and hyphenated prefixes", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_123_" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert - verify deleteMany was called with OR clause for both underscore and hyphen prefixes
      expect(prisma.thirdPartyUser.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ name: { startsWith: "E2E_123_" } }, { name: { startsWith: "E2E-123-" } }]
        }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };
      vi.mocked(prisma.location.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to cleanup test data" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
