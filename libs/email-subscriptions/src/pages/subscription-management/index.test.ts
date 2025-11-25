import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as subscriptionService from "../../repository/service.js";
import { GET } from "./index.js";

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

vi.mock("../../repository/service.js", () => ({
  getSubscriptionsByUserId: vi.fn()
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
    it("should render page with subscriptions", async () => {
      const mockSubscriptions = [
        { subscriptionId: "sub1", userId: "user123", locationId: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId: "user123", locationId: "789", dateAdded: new Date() }
      ];

      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          count: 2,
          subscriptions: expect.arrayContaining([
            expect.objectContaining({ locationName: "Location 456" }),
            expect.objectContaining({ locationName: "Location 789" })
          ])
        })
      );
    });

    it("should render page with no subscriptions", async () => {
      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          count: 0
        })
      );
    });

    it("should use test-user-id when no user in request", async () => {
      mockReq.user = undefined;
      vi.mocked(subscriptionService.getSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionsByUserId).toHaveBeenCalledWith("test-user-id");
    });
  });
});
