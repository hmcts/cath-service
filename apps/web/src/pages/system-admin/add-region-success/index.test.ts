import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import after mocking
const { GET } = await import("./index.js");

describe("add-region-success page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      session: {} as any
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render success page with English content when session data exists", async () => {
      mockRequest.session = {
        regionSuccess: {
          name: "London",
          welshName: "Llundain"
        }
      } as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region-success/index",
        expect.objectContaining({
          successBannerTitle: "Added Successfully",
          regionSuccess: {
            name: "London",
            welshName: "Llundain"
          },
          locale: "en"
        })
      );
      expect(mockRequest.session.regionSuccess).toBeUndefined();
    });

    it("should render success page with Welsh content", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.session = {
        regionSuccess: {
          name: "London",
          welshName: "Llundain"
        }
      } as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-region-success/index",
        expect.objectContaining({
          successBannerTitle: "Ychwanegwyd yn Llwyddiannus",
          locale: "cy"
        })
      );
    });

    it("should redirect to add-region page when no session data", async () => {
      mockRequest.session = {} as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-region");
      expect(mockResponse.render).not.toHaveBeenCalled();
    });

    it("should preserve Welsh language in redirect when no session data", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.session = {} as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-region?lng=cy");
    });
  });
});
