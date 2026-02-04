import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "../../../user-management/queries.js";
import { GET, POST } from "./index.js";

vi.mock("../../../user-management/queries.js", () => ({
  getUserById: vi.fn(),
  deleteUserById: vi.fn()
}));

describe("delete-user-confirm page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      userId: "user123",
      email: "test@example.com"
    };
    mockRequest = {
      query: {},
      params: { userId: "user123" },
      body: {},
      user: { id: "admin123" }
    };
    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("GET handler", () => {
    it("should render delete-user-confirm page", async () => {
      // Arrange
      vi.mocked(queries.getUserById).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(queries.getUserById).toHaveBeenCalledWith("user123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "delete-user-confirm/[userId]/index",
        expect.objectContaining({
          user: mockUser
        })
      );
    });

    it("should return 404 when user not found", async () => {
      // Arrange
      vi.mocked(queries.getUserById).mockResolvedValue(null);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/404");
    });

    it("should return 403 when trying to delete self", async () => {
      // Arrange
      mockRequest.user = { id: "user123" };
      mockRequest.params = { userId: "user123" };
      vi.mocked(queries.getUserById).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/403",
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });
  });

  describe("POST handler", () => {
    it("should redirect to manage-user when 'no' is selected", async () => {
      // Arrange
      mockRequest.body = { confirmation: "no" };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/manage-user/user123");
      expect(queries.deleteUserById).not.toHaveBeenCalled();
    });

    it("should delete user and redirect to success when 'yes' is selected", async () => {
      // Arrange
      mockRequest.body = { confirmation: "yes" };
      vi.mocked(queries.deleteUserById).mockResolvedValue();

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(queries.deleteUserById).toHaveBeenCalledWith("user123");
      expect(mockResponse.redirect).toHaveBeenCalledWith("/delete-user-success");
    });

    it("should show validation error when no selection made", async () => {
      // Arrange
      mockRequest.body = {};
      vi.mocked(queries.getUserById).mockResolvedValue(mockUser);

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "delete-user-confirm/[userId]/index",
        expect.objectContaining({
          errors: expect.any(Array),
          user: mockUser
        })
      );
    });

    it("should return 403 when trying to delete self", async () => {
      // Arrange
      mockRequest.user = { id: "user123" };
      mockRequest.body = { confirmation: "yes" };

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(queries.deleteUserById).not.toHaveBeenCalled();
    });

    it("should handle delete errors", async () => {
      // Arrange
      mockRequest.body = { confirmation: "yes" };
      vi.mocked(queries.deleteUserById).mockRejectedValue(new Error("Delete failed"));

      const handler = POST[POST.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/500");
    });
  });
});
