import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("subscription-confirmed", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      session: {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456", "789"]
        }
      } as any,
      path: "/subscription-confirmed"
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
    it("should render page with confirmed locations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: expect.arrayContaining(["Location 456", "Location 789"]),
          isPlural: true
        })
      );
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toBeUndefined();
    });

    it("should redirect if confirmation not complete", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should handle single confirmed location", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          isPlural: false
        })
      );
    });

    it("should handle empty confirmed locations", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: []
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: []
        })
      );
    });
  });
});
