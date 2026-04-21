import * as subscriptionService from "@hmcts/subscriptions";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  getCaseSubscriptionsByUserId: vi.fn(),
  getCourtSubscriptionsByUserId: vi.fn()
}));

describe("subscription-management", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      path: "/subscription-management"
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
    it("should render page with court subscriptions", async () => {
      const mockCourtSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 456,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          type: "court" as const,
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 789,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue(mockCourtSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getCourtSubscriptionsByUserId).toHaveBeenCalledWith("user123", "en");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          count: 2,
          courtSubscriptions: mockCourtSubscriptions,
          caseSubscriptions: [],
          hasCourtSubscriptions: true,
          hasCaseSubscriptions: false,
          allSubscriptionsCount: 2,
          courtSubscriptionsCount: 2,
          caseSubscriptionsCount: 0
        })
      );
    });

    it("should render page with no subscriptions", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          count: 0,
          hasCaseSubscriptions: false,
          hasCourtSubscriptions: false
        })
      );
    });

    it("should redirect to sign-in when no user in request", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(subscriptionService.getCourtSubscriptionsByUserId).not.toHaveBeenCalled();
    });

    it("should render empty state on error", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockRejectedValue(new Error("DB error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          count: 0,
          caseSubscriptions: [],
          courtSubscriptions: []
        })
      );
    });
  });
});
