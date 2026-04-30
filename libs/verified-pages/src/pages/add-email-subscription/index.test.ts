import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("add-email-subscription", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/add-email-subscription"
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
    it("should render the page", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "add-email-subscription/index",
        expect.objectContaining({
          heading: "How do you want to add an email subscription?"
        })
      );
    });

    it("should render Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "add-email-subscription/index",
        expect.objectContaining({
          heading: "Sut ydych chi am ychwanegu tanysgrifiad e-bost?"
        })
      );
    });
  });

  describe("POST", () => {
    it("should show validation error when no option selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "add-email-subscription/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Select how you want to add an email subscription" })])
          })
        })
      );
    });

    it("should redirect to location-name-search when court or tribunal selected", async () => {
      mockReq.body = { subscriptionMethod: "courtOrTribunal" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should redirect to subscription-management for case name option", async () => {
      mockReq.body = { subscriptionMethod: "caseName" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should redirect to subscription-management for case reference option", async () => {
      mockReq.body = { subscriptionMethod: "caseReference" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
