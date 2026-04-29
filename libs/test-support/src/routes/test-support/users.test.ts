import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./users.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("users routes", () => {
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

  describe("POST", () => {
    it("should create user with required fields", async () => {
      // Arrange
      mockRequest.body = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe"
      };
      const mockUser = {
        userId: "user1",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe"
      };
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: "user1",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe"
      });
    });

    it("should create user with optional fields", async () => {
      // Arrange
      mockRequest.body = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe",
        userProvenance: "CRIME_IDAM",
        userProvenanceId: "custom-id",
        role: "SYSTEM_ADMIN"
      };
      vi.mocked(prisma.user.create).mockResolvedValue({
        userId: "user1",
        ...mockRequest.body
      } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          firstName: "John",
          surname: "Doe",
          userProvenance: "CRIME_IDAM",
          userProvenanceId: "custom-id",
          role: "SYSTEM_ADMIN"
        }
      });
    });

    it("should use default values for optional fields", async () => {
      // Arrange
      mockRequest.body = {
        email: "test@example.com",
        firstName: "John",
        surname: "Doe"
      };
      vi.mocked(prisma.user.create).mockResolvedValue({
        userId: "user1",
        email: "test@example.com",
        firstName: "John",
        surname: "Doe"
      } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userProvenance: "PI_AAD",
          role: "VERIFIED"
        })
      });
    });

    it("should return 400 when email is missing", async () => {
      // Arrange
      mockRequest.body = { firstName: "John", surname: "Doe" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "email, firstName, and surname are required"
      });
    });

    it("should return 400 when firstName is missing", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", surname: "Doe" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when surname is missing", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", firstName: "John" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", firstName: "John", surname: "Doe" };
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create test user" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete users by userIds", async () => {
      // Arrange
      mockRequest.body = { userIds: ["user1", "user2", "user3"] };
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 3 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { userId: { in: ["user1", "user2", "user3"] } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 3 });
    });

    it("should return 400 when userIds is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "userIds array is required" });
    });

    it("should return 400 when userIds is not an array", async () => {
      // Arrange
      mockRequest.body = { userIds: "not-array" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when userIds array is empty", async () => {
      // Arrange
      mockRequest.body = { userIds: [] };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { userIds: ["user1"] };
      vi.mocked(prisma.user.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete test users" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
