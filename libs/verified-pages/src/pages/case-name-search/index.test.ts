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

const mockSearchByCaseName = vi.fn();
vi.mock("@hmcts/subscription", () => ({
  searchByCaseName: mockSearchByCaseName
}));

describe("case-name-search", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      path: "/case-name-search",
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
        expect(en.caseNameLabel).toBeDefined();
        expect(en.caseNameHint).toBeDefined();
        expect(en.continueButton).toBeDefined();
        expect(en.errorRequired).toBeDefined();
        expect(en.errorNoResults).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
      });

      it("should have correct title", () => {
        expect(en.title).toBe("By case name");
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });

      it("should have Welsh translations", () => {
        expect(cy.title).toBe("Yn ôl enw'r achos");
        expect(cy.continueButton).toBe("Parhau");
      });
    });
  });

  describe("GET", () => {
    it("should render page with English translations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
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
        "case-name-search/index",
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
    it("should show validation error when case name is empty", async () => {
      mockReq.body = { caseName: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorRequired,
              href: "#caseName"
            })
          ]),
          fieldErrors: expect.objectContaining({
            caseName: expect.objectContaining({ text: en.errorRequired })
          })
        })
      );
    });

    it("should show validation error when case name is less than 3 characters", async () => {
      mockReq.body = { caseName: "ab" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorRequired
            })
          ])
        })
      );
    });

    it("should redirect to results page when cases are found", async () => {
      const mockResults = [
        { id: "1", caseNumber: "12341234", caseName: "Test Case", artefactId: "art1" },
        { id: "2", caseNumber: "56785678", caseName: "Another Case", artefactId: "art2" }
      ];
      mockSearchByCaseName.mockResolvedValue(mockResults);
      mockReq.body = { caseName: "Test" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockSearchByCaseName).toHaveBeenCalledWith("Test");
      expect(mockReq.session.caseSearch?.nameResults).toEqual(mockResults);
      expect(mockRes.redirect).toHaveBeenCalledWith("/case-name-search-results");
    });

    it("should show no results error when no cases are found", async () => {
      mockSearchByCaseName.mockResolvedValue([]);
      mockReq.body = { caseName: "NonExistent" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorNoResults,
              href: "#caseName"
            })
          ]),
          fieldErrors: expect.objectContaining({
            caseName: expect.objectContaining({ text: en.errorNoResultsField })
          }),
          data: expect.objectContaining({ caseName: "NonExistent" })
        })
      );
    });

    it("should handle search errors", async () => {
      mockSearchByCaseName.mockRejectedValue(new Error("Database error"));
      mockReq.body = { caseName: "Test" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: "An error occurred while searching"
            })
          ]),
          data: expect.objectContaining({ caseName: "Test" })
        })
      );
    });

    it("should show Welsh error messages when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = { caseName: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
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
