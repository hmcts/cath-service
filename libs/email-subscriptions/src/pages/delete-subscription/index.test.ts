import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "../../repository/queries.js";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("../../repository/queries.js", () => ({
  findSubscriptionById: vi.fn()
}));

describe("delete-subscription", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      session: {} as any,
      user: { id: "user123" } as any
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      locals: {}
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should redirect if no subscriptionId provided", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect if subscriptionId is not a valid UUID", async () => {
      mockReq.query = { subscriptionId: "invalid-uuid" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect if subscription not found", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(queries.findSubscriptionById).mockResolvedValue(null);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect if user does not own the subscription", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(queries.findSubscriptionById).mockResolvedValue({
        subscriptionId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "different-user",
        locationId: "456",
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render page when user owns the subscription", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(queries.findSubscriptionById).mockResolvedValue({
        subscriptionId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user123",
        locationId: "456",
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "delete-subscription/index",
        expect.objectContaining({
          subscriptionId: "550e8400-e29b-41d4-a716-446655440000"
        })
      );
    });

    it("should redirect on database error", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(queries.findSubscriptionById).mockRejectedValue(new Error("DB error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });

  describe("POST", () => {
    it("should redirect to GET page when no confirmation choice provided", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscriptionId: validSubscriptionId };
      vi.mocked(queries.findSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: "456",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith(`/delete-subscription?subscriptionId=${validSubscriptionId}`);
    });

    it("should redirect to subscription-management if user selects no", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscription: validSubscriptionId, "unsubscribe-confirm": "no" };
      vi.mocked(queries.findSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: "456",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should store subscription in session and redirect if user selects yes", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscription: validSubscriptionId, "unsubscribe-confirm": "yes" };
      mockReq.session = {} as any;
      vi.mocked(queries.findSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: "456",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.subscriptionToRemove).toBe(validSubscriptionId);
      expect(mockRes.redirect).toHaveBeenCalledWith("/unsubscribe-confirmation");
    });

    it("should redirect to subscription-management if no subscription provided", async () => {
      mockReq.body = { "unsubscribe-confirm": "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
