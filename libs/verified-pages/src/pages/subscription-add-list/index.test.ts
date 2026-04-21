import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => ({
    locationId: id,
    name: `Location ${id}`,
    welshName: `Lleoliad ${id}`,
    subJurisdictions: [1, 2],
    regions: []
  }))
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findMany: vi.fn()
    }
  }
}));

describe("subscription-add-list", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/subscription-add-list",
      session: {
        emailSubscriptions: {
          confirmedLocations: ["100", "200"]
        }
      } as any
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
    it("should render list types from sub-jurisdictions of confirmed locations", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([
        {
          id: 1,
          name: "Civil List",
          friendlyName: "Civil List",
          welshFriendlyName: null,
          shortenedFriendlyName: null,
          url: null,
          defaultSensitivity: null,
          allowedProvenance: "MANUAL",
          isNonStrategic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        },
        {
          id: 2,
          name: "Family List",
          friendlyName: "Family List",
          welshFriendlyName: null,
          shortenedFriendlyName: null,
          url: null,
          defaultSensitivity: null,
          allowedProvenance: "MANUAL",
          isNonStrategic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        }
      ] as any);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add-list/index",
        expect.objectContaining({
          listTypeGroups: expect.arrayContaining([
            expect.objectContaining({ letter: "C", items: expect.arrayContaining([expect.objectContaining({ listTypeId: 1, name: "Civil List" })]) }),
            expect.objectContaining({ letter: "F", items: expect.arrayContaining([expect.objectContaining({ listTypeId: 2, name: "Family List" })]) })
          ])
        })
      );
    });

    it("should render empty list when no confirmed locations", async () => {
      mockReq.session = { emailSubscriptions: { confirmedLocations: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-add-list/index", expect.objectContaining({ listTypeGroups: [] }));
    });

    it("should render empty list when locations have no sub-jurisdictions", async () => {
      const { getLocationById } = await import("@hmcts/location");
      vi.mocked(getLocationById).mockResolvedValue({
        locationId: 100,
        name: "Location 100",
        welshName: "Lleoliad 100",
        subJurisdictions: [],
        regions: []
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-add-list/index", expect.objectContaining({ listTypeGroups: [] }));
    });
  });

  describe("POST", () => {
    it("should store selected list type IDs in session and redirect", async () => {
      mockReq.body = { selectedListTypes: ["1", "3"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([1, 3]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list-language");
    });

    it("should store a single list type ID as an array in session", async () => {
      mockReq.body = { selectedListTypes: "2" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([2]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list-language");
    });

    it("should show validation error when no list type selected", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please select a list type to continue" })])
          })
        })
      );
    });
  });
});
