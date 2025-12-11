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
  getSubscriptionDetailsForConfirmation: vi.fn(),
  validateSubscriptionOwnership: vi.fn(),
  deleteSubscriptionsByIds: vi.fn()
}));

describe("confirm-bulk-unsubscribe", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      path: "/confirm-bulk-unsubscribe",
      body: {},
      session: {
        bulkUnsubscribe: {
          selectedIds: ["sub-1", "sub-2"]
        }
      } as any
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en", navigation: {} }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render confirmation page with subscription details", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court" as const,
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionDetailsForConfirmation).toHaveBeenCalledWith(["sub-1", "sub-2"], "en");
      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          courtSubscriptions: mockSubscriptions,
          caseSubscriptions: [],
          hasCourtSubscriptions: true,
          hasCaseSubscriptions: false
        })
      );
    });

    it("should redirect to bulk-unsubscribe when no subscriptions in session", async () => {
      mockReq.session = {} as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to bulk-unsubscribe when selectedIds is empty", async () => {
      mockReq.session = {
        bulkUnsubscribe: {
          selectedIds: []
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle errors gracefully and redirect", async () => {
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockRejectedValue(new Error("Database error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });
  });

  describe("POST", () => {
    it("should delete subscriptions and redirect to success page when confirmed", async () => {
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockResolvedValue(2);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.deleteSubscriptionsByIds).toHaveBeenCalledWith(["sub-1", "sub-2"], "user123");
      expect(mockReq.session.bulkUnsubscribe).toEqual({});
      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe-success");
    });

    it("should redirect to subscription-management when user selects no", async () => {
      mockReq.body = { confirm: "no" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({});
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render error when confirm not provided", async () => {
      mockReq.body = {};
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue([
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          errors: expect.any(Array)
        })
      );
    });

    it("should redirect to bulk-unsubscribe when no subscriptions in session", async () => {
      mockReq.session = {} as any;
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockRejectedValue(new Error("No subscriptions provided for deletion"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to bulk-unsubscribe when selectedIds is empty", async () => {
      mockReq.session = {
        bulkUnsubscribe: {
          selectedIds: []
        }
      } as any;
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockRejectedValue(new Error("No subscriptions provided for deletion"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.body = { confirm: "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle deletion errors and redirect to bulk-unsubscribe", async () => {
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockRejectedValue(new Error("Unauthorized: User does not own all selected subscriptions"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });
  });
});
