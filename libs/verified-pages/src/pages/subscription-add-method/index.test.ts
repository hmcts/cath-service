import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("subscription-add-method", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      path: "/subscription-add-method"
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
        "subscription-add-method/index",
        expect.objectContaining({
          pageTitle: "How do you want to add an email subscription?",
          data: {}
        })
      );
    });

    it("should use Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add-method/index",
        expect.objectContaining({
          pageTitle: "Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to subscription-by-location when location option selected", async () => {
      mockReq.body = { subscriptionMethod: "location" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-by-location");
    });

    it("should redirect to subscription-management when case option selected", async () => {
      mockReq.body = { subscriptionMethod: "case" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect to subscription-management when reference option selected", async () => {
      mockReq.body = { subscriptionMethod: "reference" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render with error when no option selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add-method/index",
        expect.objectContaining({
          errors: [
            {
              text: "Select how you want to add an email subscription.",
              href: "#subscription-method"
            }
          ],
          data: {}
        })
      );
    });

    it("should render with error in Welsh when no option selected and locale is cy", async () => {
      mockReq.body = {};
      mockRes.locals = { locale: "cy" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add-method/index",
        expect.objectContaining({
          errors: [
            {
              text: "Dewiswch sut ydych chi am ychwanegu tanysgrifiad e-bost.",
              href: "#subscription-method"
            }
          ]
        })
      );
    });
  });
});
