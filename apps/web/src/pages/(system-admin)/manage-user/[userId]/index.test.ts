import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    getUserById: vi.fn()
  };
});

import { getUserById } from "@hmcts/system-admin-pages";
import { GET } from "./index.js";

describe("manage-user page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      params: {}
    };
    mockResponse = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("GET handler", () => {
    it("should render manage-user page with user details", async () => {
      // Arrange
      const mockUser = {
        userId: "123",
        email: "test@example.com",
        firstName: "Test",
        surname: "User",
        userProvenance: "CFT_IDAM",
        userProvenanceId: "prov123",
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      mockRequest.params = { userId: "123" };
      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(getUserById).toHaveBeenCalledWith("123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "manage-user/[userId]/index",
        expect.objectContaining({
          user: expect.objectContaining({
            userId: mockUser.userId,
            email: mockUser.email,
            role: mockUser.role,
            userProvenance: mockUser.userProvenance,
            createdDate: expect.any(String),
            lastSignedInDate: expect.any(String)
          })
        })
      );
    });

    it("should return 404 when user not found", async () => {
      // Arrange
      mockRequest.params = { userId: "nonexistent" };
      vi.mocked(getUserById).mockResolvedValue(null);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/404");
    });

    it("should return 404 when userId is missing", async () => {
      // Arrange
      mockRequest.params = {};

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/404");
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.params = { userId: "123" };
      vi.mocked(getUserById).mockRejectedValue(new Error("Database error"));

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/500");
    });
  });
});
