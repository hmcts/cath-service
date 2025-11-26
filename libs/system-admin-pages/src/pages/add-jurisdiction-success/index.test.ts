import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import after mocking
const { GET } = await import("./index.js");

describe("add-jurisdiction-success page", () => {
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
    it("should render success page when session flag is set", async () => {
      mockRequest.session = { jurisdictionSuccess: { name: "Civil", welshName: "Sifil" } } as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction-success/index",
        expect.objectContaining({
          successBannerTitle: "Added Successfully"
        })
      );
      expect(mockRequest.session.jurisdictionSuccess).toBeUndefined();
    });

    it("should redirect to add-jurisdiction when session flag is not set", async () => {
      mockRequest.session = {} as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/add-jurisdiction");
      expect(mockResponse.render).not.toHaveBeenCalled();
    });

    it("should render with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.session = { jurisdictionSuccess: { name: "Civil", welshName: "Sifil" } } as any;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith(
        "add-jurisdiction-success/index",
        expect.objectContaining({
          successBannerTitle: "Ychwanegwyd yn Llwyddiannus"
        })
      );
    });
  });
});
