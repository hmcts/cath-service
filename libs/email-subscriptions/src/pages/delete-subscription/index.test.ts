import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => [])
}));

describe("delete-subscription", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      session: {} as any
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should redirect if no subscriptionId provided", async () => {
      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render page with subscriptionId", async () => {
      mockReq.query = { subscriptionId: "sub123" };

      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "delete-subscription/index",
        expect.objectContaining({
          subscriptionId: "sub123"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to subscription-management if no option selected", async () => {
      mockReq.body = { subscription: "sub123" };

      await POST[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect to subscription-management if user selects no", async () => {
      mockReq.body = { subscription: "sub123", "unsubscribe-confirm": "no" };

      await POST[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should store subscription in session and redirect if user selects yes", async () => {
      mockReq.body = { subscription: "sub123", "unsubscribe-confirm": "yes" };
      mockReq.session = {} as any;

      await POST[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.subscriptionToRemove).toBe("sub123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/unsubscribe-confirmation");
    });

    it("should redirect to subscription-management if no subscription provided", async () => {
      mockReq.body = { "unsubscribe-confirm": "yes" };

      await POST[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
