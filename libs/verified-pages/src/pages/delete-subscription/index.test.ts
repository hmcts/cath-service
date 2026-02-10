import * as subscriptionService from "@hmcts/subscriptions";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  getSubscriptionById: vi.fn()
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

    it("should redirect if subscription not found or user does not own it", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(subscriptionService.getSubscriptionById).mockResolvedValue(null);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render page when user owns the subscription", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(subscriptionService.getSubscriptionById).mockResolvedValue({
        subscriptionId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", "user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "delete-subscription/index",
        expect.objectContaining({
          subscriptionId: "550e8400-e29b-41d4-a716-446655440000"
        })
      );
    });

    it("should redirect on database error", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000" };
      vi.mocked(subscriptionService.getSubscriptionById).mockRejectedValue(new Error("DB error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should handle comma-separated subscription IDs for deduplicated subscriptions", async () => {
      const id1 = "550e8400-e29b-41d4-a716-446655440000";
      const id2 = "550e8400-e29b-41d4-a716-446655440001";
      mockReq.query = { subscriptionId: `${id1},${id2}` };

      vi.mocked(subscriptionService.getSubscriptionById)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockResolvedValueOnce({
          subscriptionId: id2,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id1, "user123");
      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id2, "user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "delete-subscription/index",
        expect.objectContaining({
          subscriptionId: `${id1},${id2}`
        })
      );
    });

    it("should redirect if any of the comma-separated IDs is invalid", async () => {
      mockReq.query = { subscriptionId: "550e8400-e29b-41d4-a716-446655440000,invalid-id" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(subscriptionService.getSubscriptionById).not.toHaveBeenCalled();
    });

    it("should redirect if user does not own all comma-separated subscriptions", async () => {
      const id1 = "550e8400-e29b-41d4-a716-446655440000";
      const id2 = "550e8400-e29b-41d4-a716-446655440001";
      mockReq.query = { subscriptionId: `${id1},${id2}` };

      vi.mocked(subscriptionService.getSubscriptionById)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockResolvedValueOnce(null);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id1, "user123");
      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id2, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });

  describe("POST", () => {
    it("should redirect to GET page when no confirmation choice provided", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscriptionId: validSubscriptionId };
      vi.mocked(subscriptionService.getSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(validSubscriptionId, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith(`/delete-subscription?subscriptionId=${validSubscriptionId}`);
    });

    it("should redirect to subscription-management if user selects no", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscription: validSubscriptionId, "unsubscribe-confirm": "no" };
      vi.mocked(subscriptionService.getSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(validSubscriptionId, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should store subscription in session and redirect if user selects yes", async () => {
      const validSubscriptionId = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.body = { subscription: validSubscriptionId, "unsubscribe-confirm": "yes" };
      mockReq.session = {} as any;
      vi.mocked(subscriptionService.getSubscriptionById).mockResolvedValue({
        subscriptionId: validSubscriptionId,
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(validSubscriptionId, "user123");
      expect(mockReq.session.emailSubscriptions?.subscriptionToRemove).toBe(validSubscriptionId);
      expect(mockRes.redirect).toHaveBeenCalledWith("/unsubscribe-confirmation");
    });

    it("should redirect to subscription-management if no subscription provided", async () => {
      mockReq.body = { "unsubscribe-confirm": "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should handle comma-separated subscription IDs when user confirms", async () => {
      const id1 = "550e8400-e29b-41d4-a716-446655440000";
      const id2 = "550e8400-e29b-41d4-a716-446655440001";
      mockReq.body = { subscription: `${id1},${id2}`, "unsubscribe-confirm": "yes" };
      mockReq.session = {} as any;

      vi.mocked(subscriptionService.getSubscriptionById)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockResolvedValueOnce({
          subscriptionId: id2,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id1, "user123");
      expect(subscriptionService.getSubscriptionById).toHaveBeenCalledWith(id2, "user123");
      expect(mockReq.session.emailSubscriptions?.subscriptionToRemove).toBe(`${id1},${id2}`);
      expect(mockRes.redirect).toHaveBeenCalledWith("/unsubscribe-confirmation");
    });

    it("should redirect to GET with comma-separated IDs when no confirmation", async () => {
      const id1 = "550e8400-e29b-41d4-a716-446655440000";
      const id2 = "550e8400-e29b-41d4-a716-446655440001";
      mockReq.body = { subscriptionId: `${id1},${id2}` };

      vi.mocked(subscriptionService.getSubscriptionById)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockResolvedValueOnce({
          subscriptionId: id2,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith(`/delete-subscription?subscriptionId=${id1},${id2}`);
    });

    it("should redirect if any comma-separated ID is invalid format", async () => {
      mockReq.body = { subscription: "550e8400-e29b-41d4-a716-446655440000,invalid-uuid" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(subscriptionService.getSubscriptionById).not.toHaveBeenCalled();
    });

    it("should redirect if user does not own all comma-separated subscriptions in POST", async () => {
      const id1 = "550e8400-e29b-41d4-a716-446655440000";
      const id2 = "550e8400-e29b-41d4-a716-446655440001";
      mockReq.body = { subscription: `${id1},${id2}`, "unsubscribe-confirm": "yes" };
      mockReq.session = {} as any;

      vi.mocked(subscriptionService.getSubscriptionById)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockResolvedValueOnce(null);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
