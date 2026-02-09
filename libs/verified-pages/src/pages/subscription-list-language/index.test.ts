import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("subscription-list-language", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      path: "/subscription-list-language"
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
    it("should render page with empty data", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          pageTitle: "What version of the list type do you want to receive?",
          data: {}
        })
      );
    });

    it("should use Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          pageTitle: "Pa fersiwn o'r rhestr ydych chi am ei derbyn?"
        })
      );
    });

    it("should restore session data if present", async () => {
      mockReq.session = {
        listTypeSubscription: {
          language: "WELSH"
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          data: { language: "WELSH" }
        })
      );
    });
  });

  describe("POST", () => {
    it("should save language selection and redirect for ENGLISH", async () => {
      mockReq.body = { language: "ENGLISH" };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.listTypeSubscription).toEqual({
        language: "ENGLISH"
      });
      expect(sessionSave).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirm");
    });

    it("should save language selection and redirect for WELSH", async () => {
      mockReq.body = { language: "WELSH" };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.listTypeSubscription).toEqual({
        language: "WELSH"
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirm");
    });

    it("should save language selection and redirect for BOTH", async () => {
      mockReq.body = { language: "BOTH" };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.listTypeSubscription).toEqual({
        language: "BOTH"
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirm");
    });

    it("should render with error when no language selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          errors: [
            {
              text: "Please select version of the list type to continue",
              href: "#language"
            }
          ],
          data: {}
        })
      );
    });

    it("should render with error in Welsh when no language selected and locale is cy", async () => {
      mockReq.body = {};
      mockRes.locals = { locale: "cy" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          errors: [
            {
              text: "Dewiswch fersiwn o'r math o restr Dewiswch opsiwn",
              href: "#language"
            }
          ]
        })
      );
    });

    it("should reject invalid language values", async () => {
      mockReq.body = { language: "INVALID_LANGUAGE" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          errors: [
            {
              text: "Please select version of the list type to continue",
              href: "#language"
            }
          ],
          data: { language: "INVALID_LANGUAGE" }
        })
      );
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it("should show error message on session save error", async () => {
      mockReq.body = { language: "ENGLISH" };
      mockReq.session = {} as any;
      const sessionSave = vi.fn((cb) => cb(new Error("Session error")));
      mockReq.session.save = sessionSave;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-list-language/index",
        expect.objectContaining({
          errors: [
            {
              text: "Sorry, there was a problem saving your selection. Please try again.",
              href: "#language"
            }
          ]
        })
      );
    });
  });
});
