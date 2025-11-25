import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  buildJurisdictionItems: vi.fn(() => []),
  buildRegionItems: vi.fn(() => []),
  buildSubJurisdictionItemsByJurisdiction: vi.fn(() => ({})),
  getAllJurisdictions: vi.fn(() => []),
  getAllRegions: vi.fn(() => []),
  getAllSubJurisdictions: vi.fn(() => []),
  getLocationsGroupedByLetter: vi.fn(() => ({ A: [] })),
  getSubJurisdictionsForJurisdiction: vi.fn(() => [])
}));

describe("location-name-search", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      session: {
        save: vi.fn((callback: (err: Error | null) => void) => callback(null))
      } as any,
      path: "/location-name-search"
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
    it("should render page with default filters", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("location-name-search/index", expect.any(Object));
    });

    it("should handle jurisdiction filter", async () => {
      mockReq.query = { jurisdiction: "1" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalled();
    });

    it("should handle region filter", async () => {
      mockReq.query = { region: "2" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalled();
    });

    it("should handle multiple filters", async () => {
      mockReq.query = { jurisdiction: "1", region: "2", subJurisdiction: "3" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should handle single location selection", async () => {
      mockReq.body = { locationIds: "123" };
      mockReq.session = {
        save: vi.fn((callback: (err: Error | null) => void) => callback(null))
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["123"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should handle multiple location selections", async () => {
      mockReq.body = { locationIds: ["123", "456"] };
      mockReq.session = {
        save: vi.fn((callback: (err: Error | null) => void) => callback(null))
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["123", "456"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should handle no selection", async () => {
      mockReq.body = {};
      mockReq.session = {
        save: vi.fn((callback: (err: Error | null) => void) => callback(null))
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual([]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });
  });
});
