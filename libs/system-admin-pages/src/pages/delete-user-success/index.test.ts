import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("delete-user-success page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {}
    };
    mockResponse = {
      render: vi.fn()
    };
  });

  describe("GET handler", () => {
    it("should render delete-user-success page", async () => {
      // Arrange
      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "delete-user-success/index",
        expect.objectContaining({
          lng: ""
        })
      );
    });

    it("should render with Welsh language parameter", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };
      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "delete-user-success/index",
        expect.objectContaining({
          lng: "cy"
        })
      );
    });
  });
});
