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

describe("case-name-search-results", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {
        caseSearch: {
          nameResults: [
            { id: "1", caseNumber: "12341234", caseName: "Beta Case", artefactId: "art1" },
            { id: "2", caseNumber: "56785678", caseName: "Alpha Case", artefactId: "art2" }
          ]
        },
        emailSubscriptions: {
          pendingCaseSubscriptions: []
        }
      } as any,
      path: "/case-name-search-results",
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
    console.log = vi.fn();
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
        expect(en.errorNoSelection).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
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
      mockReq.session = { caseSearch: { nameResults: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/case-name-search");
    });

    it("should render results page with sorted cases", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search-results/index",
        expect.objectContaining({
          results: [expect.objectContaining({ caseName: "Alpha Case" }), expect.objectContaining({ caseName: "Beta Case" })]
        })
      );
    });

    it("should render page with English translations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search-results/index",
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
        "case-name-search-results/index",
        expect.objectContaining({
          title: cy.title,
          heading: cy.heading
        })
      );
    });
  });

  describe("POST", () => {
    it("should show validation error when no cases are selected", async () => {
      mockReq.body = { selectedCases: [] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search-results/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([
              expect.objectContaining({
                text: en.errorNoSelection,
                href: "#selectedCases"
              })
            ])
          })
        })
      );
    });

    it("should add selected cases to pending subscriptions and redirect", async () => {
      mockReq.body = { selectedCases: ["1", "2"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(2);
      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        expect.objectContaining({ id: "1", searchType: "CASE_NAME" }),
        expect.objectContaining({ id: "2", searchType: "CASE_NAME" })
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should handle single case selection", async () => {
      mockReq.body = { selectedCases: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(1);
      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions[0]).toEqual(expect.objectContaining({ id: "1", searchType: "CASE_NAME" }));
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should deduplicate already pending cases", async () => {
      mockReq.session.emailSubscriptions = {
        pendingCaseSubscriptions: [{ id: "1", caseNumber: "12341234", caseName: "Beta Case", artefactId: "art1", searchType: "CASE_NAME" }]
      } as any;
      mockReq.body = { selectedCases: ["1", "2"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(2);
    });

    it("should initialize emailSubscriptions if not present", async () => {
      mockReq.session = {
        caseSearch: {
          nameResults: [{ id: "1", caseNumber: "12341234", caseName: "Test", artefactId: "art1" }]
        }
      } as any;
      mockReq.body = { selectedCases: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.emailSubscriptions).toBeDefined();
      expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toBeDefined();
    });

    it("should show Welsh error messages when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = { selectedCases: [] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search-results/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([
              expect.objectContaining({
                text: cy.errorNoSelection
              })
            ])
          })
        })
      );
    });
  });
});
