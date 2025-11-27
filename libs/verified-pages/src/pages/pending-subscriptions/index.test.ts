import * as subscriptionService from "@hmcts/subscriptions";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id) => ({
    locationId: id,
    name: `Location ${id}`,
    welshName: `Lleoliad ${id}`
  }))
}));

vi.mock("@hmcts/subscriptions", () => ({
  getSubscriptionsByUserId: vi.fn(),
  replaceUserSubscriptions: vi.fn()
}));

describe("pending-subscriptions", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      body: {},
      session: {
        emailSubscriptions: {
          pendingSubscriptions: ["456", "789"]
        }
      } as any,
      path: "/pending-subscriptions"
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
    it("should render page with pending subscriptions", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([
            expect.objectContaining({ locationId: "456", name: "Location 456" }),
            expect.objectContaining({ locationId: "789", name: "Location 789" })
          ]),
          isPlural: true
        })
      );
    });

    it("should render error when no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object),
          locations: []
        })
      );
    });

    it("should handle single pending subscription", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          isPlural: false
        })
      );
    });
  });

  describe("POST", () => {
    it("should remove location when action is remove", async () => {
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last location", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object)
        })
      );
    });

    it("should confirm subscriptions when action is confirm", async () => {
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue([
        { subscriptionId: "sub1", userId: "user123", locationId: "123", dateAdded: new Date() }
      ]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({
        added: 2,
        removed: 0
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect(subscriptionService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["123", "456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect when confirming with no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should handle error when confirming subscriptions", async () => {
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockRejectedValue(new Error("Test error"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Test error" })])
          })
        })
      );
    });

    it("should preserve existing subscriptions when adding new ones", async () => {
      mockReq.body = { action: "confirm" };
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456", "789"] } } as any;

      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue([
        { subscriptionId: "sub1", userId: "user123", locationId: "123", dateAdded: new Date() }
      ]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({
        added: 2,
        removed: 0
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["123", "456", "789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });
  });
});
