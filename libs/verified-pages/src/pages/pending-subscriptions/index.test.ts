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
  })),
  getLocationsByIds: vi.fn((ids) =>
    ids.map((id: number) => ({
      locationId: id,
      name: `Location ${id}`,
      welshName: `Lleoliad ${id}`,
      regions: [],
      subJurisdictions: []
    }))
  )
}));

vi.mock("@hmcts/subscriptions", () => ({
  getAllSubscriptionsByUserId: vi.fn(() => []),
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
      path: "/pending-subscriptions",
      app: { locals: { redisClient: {} } } as any
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

    it("should also remove location from confirmedLocations when removing from pending", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456", "789"],
          confirmedLocations: ["456", "789"]
        }
      } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last location and no case subscriptions exist", async () => {
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

    it("should initialize emailSubscriptions in session when removing and session has no emailSubscriptions", async () => {
      mockReq.session = {} as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object),
          locations: []
        })
      );
    });

    it("should confirm subscriptions when action is confirm", async () => {
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(replaceUserSubscriptions).mockResolvedValue({ added: 2, removed: 0 });

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect when confirming with no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should handle errors during subscription creation and render error page", async () => {
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(replaceUserSubscriptions).mockRejectedValue(new Error("Database connection failed"));

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Database connection failed" })])
          }),
          locations: expect.any(Array),
          isPlural: true
        })
      );
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it("should merge existing subscriptions with pending when confirming", async () => {
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([
        { subscriptionId: "sub-1", type: "court", courtOrTribunalName: "Existing Court", locationId: 999, dateAdded: new Date() }
      ] as any);
      vi.mocked(replaceUserSubscriptions).mockResolvedValue({ added: 2, removed: 0 });

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["999", "456", "789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect to sign-in when no user is present", async () => {
      mockReq.user = undefined;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should set confirmationComplete flag in session after successful confirmation", async () => {
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(replaceUserSubscriptions).mockResolvedValue({ added: 2, removed: 0 });

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
    });

    it("should merge pendingSubscriptions and confirmedLocations for display", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          confirmedLocations: ["789"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "456" }), expect.objectContaining({ locationId: "789" })])
        })
      );
    });

    it("should handle Welsh locale for location names", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ name: "Lleoliad 456" }), expect.objectContaining({ name: "Lleoliad 789" })])
        })
      );
    });
  });
});
