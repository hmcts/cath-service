import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("subscription-configure-list-language", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/subscription-configure-list-language",
      session: { emailSubscriptions: {} } as any
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
    it("should render the language selection page", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: undefined }));
    });

    it("should pre-select language from session", async () => {
      mockReq.session = { emailSubscriptions: { pendingLanguage: "WELSH" } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-language/index", expect.objectContaining({ selectedLanguage: "WELSH" }));
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
