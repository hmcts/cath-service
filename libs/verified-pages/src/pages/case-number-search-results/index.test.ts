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

describe("case-number-search-results", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {
        caseSearch: {
          numberResults: [
            { id: "1", caseNumber: "12341234", caseName: "Test Case 1", artefactId: "art1" },
            { id: "2", caseNumber: "12341234", caseName: "Test Case 2", artefactId: "art2" }
          ]
        },
        emailSubscriptions: {
          pendingCaseSubscriptions: []
        }
      } as any,
      path: "/case-number-search-results",
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
        expect(en.foundText).toBeDefined();
        expect(en.tableHeaderCaseName).toBeDefined();
        expect(en.tableHeaderCaseNumber).toBeDefined();
        expect(en.continueButton).toBeDefined();
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });
    });
  });

  describe("GET", () => {
    it("should redirect to search page when no results in session", async () => {
      mockReq.session = { caseSearch: { numberResults: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/case-number-search");
    });

    it("should render results page with search results", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search-results/index",
        expect.objectContaining({
          results: expect.arrayContaining([expect.objectContaining({ id: "1" }), expect.objectContaining({ id: "2" })])
        })
      );
    });

    it("should render page with English translations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search-results/index",
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
        "case-number-search-results/index",
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
    it("should add all results to pending subscriptions and redirect", async () => {
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(2);
      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        expect.objectContaining({ id: "1", searchType: "CASE_NUMBER" }),
        expect.objectContaining({ id: "2", searchType: "CASE_NUMBER" })
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should deduplicate already pending cases", async () => {
      mockReq.session.emailSubscriptions = {
        pendingCaseSubscriptions: [{ id: "1", caseNumber: "12341234", caseName: "Test Case 1", artefactId: "art1", searchType: "CASE_NUMBER" }]
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(2);
    });

    it("should initialize emailSubscriptions if not present", async () => {
      mockReq.session = {
        caseSearch: {
          numberResults: [{ id: "1", caseNumber: "12341234", caseName: "Test", artefactId: "art1" }]
        }
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions).toBeDefined();
      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toBeDefined();
    });

    it("should handle empty search results", async () => {
      mockReq.session = {
        caseSearch: {
          numberResults: []
        },
        emailSubscriptions: {
          pendingCaseSubscriptions: []
        }
      } as any;

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(0);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });
  });
});
