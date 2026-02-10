import * as subscriptionService from "@hmcts/subscriptions";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
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
      session: {
        save: vi.fn((callback: (err?: any) => void) => callback())
      } as any,
      csrfToken: vi.fn(() => "mock-csrf-token")
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

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.bulkUnsubscribeTitle).toBeDefined();
        expect(en.bulkUnsubscribeHeading).toBeDefined();
        expect(en.tabAllSubscriptions).toBeDefined();
        expect(en.tabSubscriptionsByCase).toBeDefined();
        expect(en.tabSubscriptionsByCourt).toBeDefined();
        expect(en.tableHeaderCaseName).toBeDefined();
        expect(en.tableHeaderPartyName).toBeDefined();
        expect(en.tableHeaderReferenceNumber).toBeDefined();
        expect(en.tableHeaderDateAdded).toBeDefined();
        expect(en.tableHeaderCourtName).toBeDefined();
        expect(en.bulkUnsubscribeButton).toBeDefined();
        expect(en.emptyStateMessage).toBeDefined();
        expect(en.noCaseSubscriptions).toBeDefined();
        expect(en.noCourtSubscriptions).toBeDefined();
        expect(en.notAvailable).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
        expect(en.errorNoSelectionMessage).toBeDefined();
        expect(en.errorNoSelectionHref).toBeDefined();
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });
    });
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

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          bulkUnsubscribeTitle: cy.bulkUnsubscribeTitle,
          bulkUnsubscribeHeading: cy.bulkUnsubscribeHeading
        })
      );
    });

    it("should handle different view parameter values", async () => {
      mockReq.query = { view: "case" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          currentView: "case"
        })
      );
    });

    it("should default to 'all' view when no view parameter provided", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          currentView: "all"
        })
      );
    });

    it("should set navigation items", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should include CSRF token in render data", async () => {
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should pass locale to getCourtSubscriptionsByUserId", async () => {
      mockRes.locals = { locale: "cy" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getCourtSubscriptionsByUserId).toHaveBeenCalledWith("user123", "cy");
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

    it("should deduplicate selected subscription IDs", async () => {
      mockReq.body = {
        subscriptions: ["sub-1", "sub-2", "sub-1", "sub-2"]
      };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe?.selectedIds).toEqual(["sub-1", "sub-2"]);
    });

    it("should show Welsh validation error when locale is cy and no subscriptions selected", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = {};

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: cy.errorNoSelectionMessage,
              href: cy.errorNoSelectionHref
            })
          ])
        })
      );
    });

    it("should preserve view parameter when redirecting on session save error", async () => {
      mockReq.body = {
        subscriptions: ["sub-1"],
        view: "case"
      };
      mockReq.session.save = vi.fn((callback: (err?: any) => void) => callback(new Error("Session save error")));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe?view=case");
    });

    it("should redirect to bulk-unsubscribe on error during validation error rendering", async () => {
      mockReq.body = { view: "court" };
      mockRes.locals = { locale: "en" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockRejectedValue(new Error("Database error"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe?view=court");
    });

    it("should use default view when view parameter not provided in POST", async () => {
      mockReq.body = {
        subscriptions: ["sub-1"]
      };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe?.selectedIds).toEqual(["sub-1"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/confirm-bulk-unsubscribe");
    });

    it("should initialize session.bulkUnsubscribe if not present", async () => {
      mockReq.session = {
        save: vi.fn((callback: (err?: any) => void) => callback())
      } as any;
      mockReq.body = {
        subscriptions: ["sub-1"]
      };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toBeDefined();
      expect(mockReq.session.bulkUnsubscribe?.selectedIds).toEqual(["sub-1"]);
    });

    it("should include CSRF token in validation error render", async () => {
      mockReq.body = {};
      mockRes.locals = { locale: "en" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should pass currentView when rendering validation error", async () => {
      mockReq.body = { view: "case" };
      mockRes.locals = { locale: "en" };

      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCourtSubscriptionsByUserId).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "bulk-unsubscribe/index",
        expect.objectContaining({
          currentView: "case"
        })
      );
    });
  });
});
