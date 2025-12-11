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
  getCaseSubscriptionsByUserId: vi.fn(),
  getCourtSubscriptionsByUserId: vi.fn()
}));

describe("bulk-unsubscribe", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      path: "/bulk-unsubscribe",
      query: {},
      body: {},
      session: {} as any
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
    it("should render page with both case and court subscriptions", async () => {
      const mockCaseSubscriptions = [
        {
          subscriptionId: "case-1",
          type: "case" as const,
          caseName: "Test Case",
          partyName: "John Doe",
          referenceNumber: "REF123",
          dateAdded: new Date()
        }
      ];

      const mockCourtSubscriptions = [
        {
          subscriptionId: "court-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue(mockCaseSubscriptions);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue(mockCourtSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          caseSubscriptions: mockCaseSubscriptions,
          courtSubscriptions: mockCourtSubscriptions,
          hasCaseSubscriptions: true,
          hasCourtSubscriptions: true,
          showEmptyState: false,
          allSubscriptionsCount: 2,
          caseSubscriptionsCount: 1,
          courtSubscriptionsCount: 1
        })
      );
    });

    it("should render empty state when no subscriptions exist", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          caseSubscriptions: [],
          courtSubscriptions: [],
          hasCaseSubscriptions: false,
          hasCourtSubscriptions: false,
          showEmptyState: true,
          allSubscriptionsCount: 0,
          caseSubscriptionsCount: 0,
          courtSubscriptionsCount: 0
        })
      );
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockRejectedValue(new Error("Database error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          showEmptyState: true,
          caseSubscriptions: [],
          courtSubscriptions: []
        })
      );
    });

    it("should restore previously selected subscriptions from session", async () => {
      mockReq.session = {
        bulkUnsubscribe: {
          selectedIds: ["sub-1", "sub-2"]
        }
      } as any;

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          previouslySelected: ["sub-1", "sub-2"]
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to confirmation page with selected subscriptions", async () => {
      mockReq.body = {
        subscriptions: ["sub-1", "sub-2"]
      };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({
        selectedIds: ["sub-1", "sub-2"]
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/confirm-bulk-unsubscribe");
    });

    it("should handle single subscription selection", async () => {
      mockReq.body = {
        subscriptions: "sub-1"
      };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({
        selectedIds: ["sub-1"]
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/confirm-bulk-unsubscribe");
    });

    it("should show validation error when no subscriptions selected", async () => {
      mockReq.body = {};
      mockRes.locals = { locale: "en" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              href: "#subscriptions"
            })
          ])
        })
      );
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });
  });
});
