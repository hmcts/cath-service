import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  getSubscriptionListTypesByUserId: vi.fn()
}));

import { getSubscriptionListTypesByUserId } from "@hmcts/subscriptions";

describe("subscription-configure-list-language", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/subscription-configure-list-language",
      session: { emailSubscriptions: {} } as any,
      user: { id: "test-user-id" }
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
    vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should render the language selection page with no pre-selection when no existing subscription", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: undefined }));
    });

    it("should pre-select language from session pendingLanguage", async () => {
      mockReq.session = { emailSubscriptions: { pendingLanguage: "WELSH" } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: "WELSH" }));
      expect(getSubscriptionListTypesByUserId).not.toHaveBeenCalled();
    });

    it("should pre-select ENGLISH from existing subscription", async () => {
      vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue({
        subscriptionListTypeId: "sub-id",
        listTypeIds: [1],
        listTypeNames: ["Test List"],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(getSubscriptionListTypesByUserId).toHaveBeenCalledWith("test-user-id");
      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: "ENGLISH" }));
    });

    it("should pre-select WELSH from existing subscription", async () => {
      vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue({
        subscriptionListTypeId: "sub-id",
        listTypeIds: [1],
        listTypeNames: ["Test List"],
        listLanguage: ["WELSH"],
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: "WELSH" }));
    });

    it("should pre-select ENGLISH_AND_WELSH from existing subscription with both languages", async () => {
      vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue({
        subscriptionListTypeId: "sub-id",
        listTypeIds: [1],
        listTypeNames: ["Test List"],
        listLanguage: ["ENGLISH", "WELSH"],
        dateAdded: new Date()
      });

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list-language/index",
        expect.objectContaining({ selectedLanguage: "ENGLISH_AND_WELSH" })
      );
    });
  });

  describe("POST", () => {
    it("should store selected language in session and redirect", async () => {
      mockReq.body = { language: "ENGLISH" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBe("ENGLISH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should store WELSH in session and redirect", async () => {
      mockReq.body = { language: "WELSH" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBe("WELSH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should store ENGLISH_AND_WELSH in session and redirect", async () => {
      mockReq.body = { language: "ENGLISH_AND_WELSH" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBe("ENGLISH_AND_WELSH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should initialize emailSubscriptions in session when it does not exist", async () => {
      mockReq.session = {} as any;
      mockReq.body = { language: "ENGLISH" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBe("ENGLISH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should show validation error when no language selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list-language/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please select a version to continue" })])
          })
        })
      );
    });

    it("should show validation error when invalid language value submitted", async () => {
      mockReq.body = { language: "INVALID" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list-language/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please select a version to continue" })])
          })
        })
      );
    });
  });
});
