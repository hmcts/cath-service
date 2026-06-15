import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { GET } = await import("./index.js");

describe("blob-explorer-resubmission-success page", () => {
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

  describe("GET", () => {
    it("should render the blob-explorer-resubmission-success page with English content", async () => {
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-resubmission-success/index",
        expect.objectContaining({
          locale: "en"
        })
      );
    });

    it("should render the blob-explorer-resubmission-success page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-resubmission-success/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });
  });
});
