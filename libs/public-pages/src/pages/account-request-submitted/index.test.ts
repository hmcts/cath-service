import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("account-request-submitted controller", () => {
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
    it("should render the confirmation page with English content by default", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          locale: "en",
          banner: expect.any(String),
          sectionTitle: expect.any(String),
          bodyText: expect.any(String)
        })
      );
    });

    it("should render the confirmation page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          locale: "cy",
          banner: expect.any(String),
          sectionTitle: expect.any(String),
          bodyText: expect.any(String)
        })
      );
    });

    it("should pass correct English content to template", async () => {
      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          banner: "Details submitted",
          sectionTitle: "What happens next"
        })
      );
    });

    it("should pass correct Welsh content to template", async () => {
      mockRequest.query = { lng: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "account-request-submitted/index",
        expect.objectContaining({
          banner: "Cyflwyno manylion",
          sectionTitle: "Beth sy'n digwydd nesaf"
        })
      );
    });
  });
});
