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
      mockRequest.body = { userId: "user-1", action: "MANAGE_USER", details: "Parity audit entry" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: "admin@example.com", role: "SYSTEM_ADMIN", userProvenance: "SSO" } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "entry-1" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: "MANAGE_USER",
          details: "Parity audit entry",
          userId: "user-1",
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

    it("should return 404 when the user does not exist", async () => {
      // Arrange
      mockRequest.body = { userId: "missing", action: "MANAGE_USER" };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
