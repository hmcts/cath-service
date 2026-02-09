import * as listTypeSubscriptionService from "@hmcts/subscription-list-types";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscription-list-types", () => ({
  createListTypeSubscriptions: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      name: "CIVIL_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    },
    {
      id: 2,
      name: "FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Family Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
      provenance: "CFT_IDAM",
      isNonStrategic: false
    }
  ]
}));

describe("subscription-confirm", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      user: { id: "user123" } as any,
      path: "/subscription-confirm"
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

  describe("GET", () => {
    it("should render confirmation page with selected list types", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1, 2],
          language: "ENGLISH"
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirm/index",
        expect.objectContaining({
          pageTitle: "Confirm your email subscriptions",
          selectedListTypes: expect.arrayContaining([
            expect.objectContaining({ englishFriendlyName: "Civil Daily Cause List" }),
            expect.objectContaining({ englishFriendlyName: "Family Daily Cause List" })
          ]),
          language: "ENGLISH",
          languageDisplay: "English"
        })
      );
    });

    it("should use Welsh content and language display when locale is cy", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1],
          language: "WELSH"
        }
      } as any;
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirm/index",
        expect.objectContaining({
          pageTitle: "Cadarnhewch eich tanysgrifiadau e-bost",
          languageDisplay: "Cymraeg"
        })
      );
    });

    it("should display BOTH language option correctly", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1],
          language: "BOTH"
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirm/index",
        expect.objectContaining({
          languageDisplay: "English and Welsh"
        })
      );
    });

    it("should redirect to list types page when session data missing", async () => {
      mockReq.session = {} as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-types");
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    it("should redirect when selectedListTypeIds is missing", async () => {
      mockReq.session = {
        listTypeSubscription: {
          language: "ENGLISH"
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-types");
    });

    it("should redirect to list language page when language is missing", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1, 2]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-language");
    });
  });

  describe("POST", () => {
    it("should create subscriptions and redirect to confirmed page", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1, 2],
          language: "ENGLISH"
        }
      } as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      vi.mocked(listTypeSubscriptionService.createListTypeSubscriptions).mockResolvedValue([
        {
          listTypeSubscriptionId: "sub1",
          userId: "user123",
          listTypeId: 1,
          language: "ENGLISH",
          dateAdded: new Date()
        },
        {
          listTypeSubscriptionId: "sub2",
          userId: "user123",
          listTypeId: 2,
          language: "ENGLISH",
          dateAdded: new Date()
        }
      ]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(listTypeSubscriptionService.createListTypeSubscriptions).toHaveBeenCalledWith("user123", [1, 2], "ENGLISH");
      expect(mockReq.session.listTypeSubscription).toBeUndefined();
      expect(mockReq.session.listTypeSubscriptionConfirmed).toBe(true);
      expect(sessionSave).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect to sign-in when user not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1],
          language: "ENGLISH"
        }
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(listTypeSubscriptionService.createListTypeSubscriptions).not.toHaveBeenCalled();
    });

    it("should redirect to list types page when session data missing", async () => {
      mockReq.session = {} as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-types");
      expect(listTypeSubscriptionService.createListTypeSubscriptions).not.toHaveBeenCalled();
    });

    it("should redirect to list language page when language is missing", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1, 2]
        }
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-language");
      expect(listTypeSubscriptionService.createListTypeSubscriptions).not.toHaveBeenCalled();
    });

    it("should render with error when subscription creation fails", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1],
          language: "ENGLISH"
        }
      } as any;

      const error = new Error("Maximum 50 list type subscriptions allowed");
      vi.mocked(listTypeSubscriptionService.createListTypeSubscriptions).mockRejectedValue(error);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirm/index",
        expect.objectContaining({
          errors: [{ text: "You have reached the maximum number of list type subscriptions. Please remove some subscriptions before adding more.", href: "#" }]
        })
      );
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it("should render with error message when subscription creation fails with duplicate error", async () => {
      mockReq.session = {
        listTypeSubscription: {
          selectedListTypeIds: [1],
          language: "ENGLISH"
        }
      } as any;

      const error = new Error("Already subscribed to list type 1 with language ENGLISH");
      vi.mocked(listTypeSubscriptionService.createListTypeSubscriptions).mockRejectedValue(error);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirm/index",
        expect.objectContaining({
          errors: [
            {
              text: "You are already subscribed to one or more of these list types with this language preference. Please check your subscriptions.",
              href: "#"
            }
          ]
        })
      );
    });
  });
});
