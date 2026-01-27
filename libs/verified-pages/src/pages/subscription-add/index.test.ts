import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("subscription-add", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/subscription-add",
      csrfToken: vi.fn(() => "mock-csrf-token")
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

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.title).toBeDefined();
        expect(en.heading).toBeDefined();
        expect(en.bodyText).toBeDefined();
        expect(en.radioLabel).toBeDefined();
        expect(en.optionCourtOrTribunal).toBeDefined();
        expect(en.optionCaseName).toBeDefined();
        expect(en.optionCaseReference).toBeDefined();
        expect(en.continueButton).toBeDefined();
        expect(en.errorRequired).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
      });

      it("should have correct title", () => {
        expect(en.title).toBe("How do you want to add an email subscription?");
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });

      it("should have Welsh translations", () => {
        expect(cy.title).toBe("Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?");
        expect(cy.continueButton).toBe("Parhau");
      });
    });
  });

  describe("GET", () => {
    it("should render page with English translations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add/index",
        expect.objectContaining({
          title: en.title,
          heading: en.heading,
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add/index",
        expect.objectContaining({
          title: cy.title,
          heading: cy.heading
        })
      );
    });

    it("should set navigation items", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });
  });

  describe("POST", () => {
    it("should redirect to location-name-search when courtOrTribunal is selected", async () => {
      mockReq.body = { subscriptionMethod: "courtOrTribunal" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should redirect to case-name-search when caseName is selected", async () => {
      mockReq.body = { subscriptionMethod: "caseName" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/case-name-search");
    });

    it("should redirect to case-number-search when caseReference is selected", async () => {
      mockReq.body = { subscriptionMethod: "caseReference" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/case-number-search");
    });

    it("should show validation error when no option is selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorRequired,
              href: "#subscriptionMethod"
            })
          ]),
          fieldErrors: expect.objectContaining({
            subscriptionMethod: expect.objectContaining({ text: en.errorRequired })
          })
        })
      );
    });

    it("should redirect back to subscription-add for invalid option", async () => {
      mockReq.body = { subscriptionMethod: "invalid" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add");
    });

    it("should show Welsh error messages when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-add/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: cy.errorRequired
            })
          ])
        })
      );
    });
  });
});
