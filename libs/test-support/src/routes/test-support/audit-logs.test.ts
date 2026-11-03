import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./audit-logs.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("audit-logs routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = { body: {}, query: {} };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should filter entries by action and details", async () => {
      // Arrange
      mockRequest.query = { action: "MANAGE_USER", details: "Parity audit entry" };
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: "MANAGE_USER", details: "Parity audit entry" },
        orderBy: { timestamp: "asc" }
      });
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });
  });

  describe("POST", () => {
    it("should record the entry with the user's email, role and provenance", async () => {
      // Arrange
      mockRequest.body = { userId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", action: "MANAGE_USER", details: "Parity audit entry" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: "admin@example.com", role: "SYSTEM_ADMIN", userProvenance: "SSO" } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "entry-1" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: "MANAGE_USER",
          details: "Parity audit entry",
          userId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
          userEmail: "admin@example.com",
          userRole: "SYSTEM_ADMIN",
          userProvenance: "SSO"
        }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should return 400 when userId or action is missing", async () => {
      // Arrange
      mockRequest.body = { action: "MANAGE_USER" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("should return 400 when userId is not a UUID", async () => {
      // Arrange
      mockRequest.body = { userId: "user-1", action: "MANAGE_USER" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "userId must be a UUID" });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should return 404 when the user does not exist", async () => {
      // Arrange
      mockRequest.body = { userId: "8b3c4d5e-6f70-4b81-9c9d-0e1f2a3b4c5d", action: "MANAGE_USER" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
