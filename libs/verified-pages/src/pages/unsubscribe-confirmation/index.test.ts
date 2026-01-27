import * as subscriptionService from "@hmcts/subscription";
import type { Request, Response } from "express";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscription", () => ({
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
      } as any,
      path: "/unsubscribe-confirmation"
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.title).toBeDefined();
        expect(en.panelTitle).toBeDefined();
        expect(en.panelText).toBeDefined();
        expect(en.continueText).toBeDefined();
        expect(en.yourAccountLink).toBeDefined();
        expect(en.inOrderTo).toBeDefined();
        expect(en.addNewSubscriptionLink).toBeDefined();
        expect(en.manageSubscriptionsLink).toBeDefined();
        expect(en.findCourtLink).toBeDefined();
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
    it("should redirect if no subscriptionToRemove in session", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(subscriptionService.removeSubscription).not.toHaveBeenCalled();
    });

    it("should remove subscription and render confirmation", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith("sub123", "user123");
      expect(mockReq.session?.emailSubscriptions?.subscriptionToRemove).toBeUndefined();
      expect(mockRes.render).toHaveBeenCalledWith("unsubscribe-confirmation/index", expect.any(Object));
    });

    it("should redirect on error", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockRejectedValue(new Error("Test error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect to sign-in when no user in request", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(subscriptionService.removeSubscription).not.toHaveBeenCalled();
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "unsubscribe-confirmation/index",
        expect.objectContaining({
          title: cy.title,
          panelTitle: cy.panelTitle
        })
      );
    });

    it("should set navigation items", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should clear subscriptionToRemove from session after removal", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.subscriptionToRemove).toBeUndefined();
    });

    it("should redirect to subscription-management when session.emailSubscriptions is undefined", async () => {
      mockReq.session = {} as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(subscriptionService.removeSubscription).not.toHaveBeenCalled();
    });

    it("should not error when clearing subscriptionToRemove if emailSubscriptions exists", async () => {
      mockReq.session = {
        emailSubscriptions: {
          subscriptionToRemove: "sub123"
        }
      } as any;
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.subscriptionToRemove).toBeUndefined();
      expect(mockRes.render).toHaveBeenCalled();
    });

    it("should handle error when removeSubscription fails with authentication error", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockRejectedValue(new Error("Authentication failed"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should handle error when removeSubscription fails with not found error", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockRejectedValue(new Error("Subscription not found"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should call removeSubscription with correct parameters", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith("sub123", "user123");
      expect(subscriptionService.removeSubscription).toHaveBeenCalledTimes(1);
    });

    it("should render page with English content by default", async () => {
      vi.mocked(subscriptionService.removeSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "unsubscribe-confirmation/index",
        expect.objectContaining({
          title: en.title,
          panelTitle: en.panelTitle
        })
      );
    });

    it("should remove multiple subscriptions for comma-separated IDs", async () => {
      const id1 = "sub123";
      const id2 = "sub456";
      mockReq.session = {
        emailSubscriptions: {
          subscriptionToRemove: `${id1},${id2}`
        }
      } as any;

      vi.mocked(subscriptionService.removeSubscription)
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

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith(id1, "user123");
      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith(id2, "user123");
      expect(subscriptionService.removeSubscription).toHaveBeenCalledTimes(2);
      expect(mockReq.session?.emailSubscriptions?.subscriptionToRemove).toBeUndefined();
      expect(mockRes.render).toHaveBeenCalledWith("unsubscribe-confirmation/index", expect.any(Object));
    });

    it("should redirect on error when removing any of multiple subscriptions", async () => {
      const id1 = "sub123";
      const id2 = "sub456";
      mockReq.session = {
        emailSubscriptions: {
          subscriptionToRemove: `${id1},${id2}`
        }
      } as any;

      vi.mocked(subscriptionService.removeSubscription)
        .mockResolvedValueOnce({
          subscriptionId: id1,
          userId: "user123",
          locationId: 456,
          dateAdded: new Date()
        })
        .mockRejectedValueOnce(new Error("Failed to remove"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith(id1, "user123");
      expect(subscriptionService.removeSubscription).toHaveBeenCalledWith(id2, "user123");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing subscription:", expect.any(Error));
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
