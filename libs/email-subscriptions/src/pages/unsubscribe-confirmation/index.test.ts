import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as subscriptionService from "../../subscription/service.js";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => [])
}));

vi.mock("../../subscription/service.js", () => ({
  removeSubscription: vi.fn()
}));

describe("unsubscribe-confirmation", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      session: {
        emailSubscriptions: {
          subscriptionToRemove: "sub123"
        }
      } as any
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
    it("should redirect if no subscriptionToRemove in session", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(subscriptionService.removeSubscription).not.toHaveBeenCalled();
    });

    it("should remove subscription and render confirmation", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: "456",
        dateAdded: new Date()
      });

      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith("sub123", "user123");
      expect(mockReq.session?.emailSubscriptions?.subscriptionToRemove).toBeUndefined();
      expect(mockRes.render).toHaveBeenCalledWith("unsubscribe-confirmation/index", expect.any(Object));
    });

    it("should redirect on error", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockRejectedValue(new Error("Test error"));

      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should use test-user-id when no user in request", async () => {
      mockReq.user = undefined;
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "test-user-id",
        locationId: "456",
        dateAdded: new Date()
      });

      await GET[0](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith("sub123", "test-user-id");
    });
  });
});
