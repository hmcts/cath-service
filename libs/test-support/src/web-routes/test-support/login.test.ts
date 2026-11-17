import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./login.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

const USER_ID = "3f2b8c1e-6d4a-4b9e-8f7a-2c5d9e1a0b3c";
const VERIFIED_USER = {
  userId: USER_ID,
  email: "E2E_123_subscriber@test.hmcts.net",
  firstName: "Test",
  surname: "User",
  userProvenance: "CFT_IDAM",
  userProvenanceId: "E2E_123_provenance",
  role: "VERIFIED"
};

describe("test-support login route", () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRequest = {
      body: { userId: USER_ID },
      session: {
        regenerate: vi.fn((callback: (error?: Error) => void) => callback()),
        save: vi.fn((callback: (error?: Error) => void) => callback())
      },
      login: vi.fn((_user: unknown, callback: (error?: Error) => void) => callback())
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("POST", () => {
    it("should start a session with the same user shape the login callbacks produce", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VERIFIED_USER as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(mockRequest.session.regenerate).toHaveBeenCalled();
      expect(mockRequest.login).toHaveBeenCalledWith(
        {
          id: USER_ID,
          email: "E2E_123_subscriber@test.hmcts.net",
          displayName: "Test User",
          role: "VERIFIED",
          provenance: "CFT_IDAM"
        },
        expect.any(Function)
      );
      expect(mockRequest.session.lastActivity).toEqual(expect.any(Number));
      expect(mockRequest.session.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: USER_ID,
        email: "E2E_123_subscriber@test.hmcts.net",
        role: "VERIFIED",
        provenance: "CFT_IDAM"
      });
    });

    it("should regenerate the session before logging in", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VERIFIED_USER as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRequest.session.regenerate.mock.invocationCallOrder[0]).toBeLessThan(mockRequest.login.mock.invocationCallOrder[0]);
      expect(mockRequest.login.mock.invocationCallOrder[0]).toBeLessThan(mockRequest.session.save.mock.invocationCallOrder[0]);
    });

    it("should fall back to the email as the display name when the user has no name", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...VERIFIED_USER, firstName: null, surname: null, userProvenance: "PI_AAD" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRequest.login).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: "E2E_123_subscriber@test.hmcts.net", provenance: "PI_AAD" }),
        expect.any(Function)
      );
    });

    it("should return 400 when userId is not a user id", async () => {
      // Arrange
      mockRequest.body = { userId: "not-a-uuid" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockRequest.login).not.toHaveBeenCalled();
    });

    it("should return 400 when the body is missing", async () => {
      // Arrange
      mockRequest.body = undefined;

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when the user does not exist", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockRequest.login).not.toHaveBeenCalled();
    });

    it("should refuse to log in a user without the VERIFIED role", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...VERIFIED_USER, role: "SYSTEM_ADMIN" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockRequest.session.regenerate).not.toHaveBeenCalled();
      expect(mockRequest.login).not.toHaveBeenCalled();
    });

    it("should return 500 when the session cannot be regenerated", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VERIFIED_USER as any);
      mockRequest.session.regenerate = vi.fn((callback: (error?: Error) => void) => callback(new Error("regenerate failed")));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockRequest.login).not.toHaveBeenCalled();
    });

    it("should return 500 when login fails", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VERIFIED_USER as any);
      mockRequest.login = vi.fn((_user: unknown, callback: (error?: Error) => void) => callback(new Error("login failed")));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockRequest.session.save).not.toHaveBeenCalled();
    });

    it("should return 500 when the session cannot be saved", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VERIFIED_USER as any);
      mockRequest.session.save = vi.fn((callback: (error?: Error) => void) => callback(new Error("save failed")));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to log in test user" });
    });

    it("should return 500 when the user lookup fails", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
