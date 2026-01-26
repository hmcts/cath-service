import { searchByCaseReference } from "@hmcts/subscription";
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

vi.mock("@hmcts/subscription", () => ({
  searchByCaseReference: vi.fn()
}));

describe("case-number-search", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      session: {} as any,
      path: "/case-number-search",
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
    console.error = vi.fn();
  });

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.title).toBeDefined();
        expect(en.heading).toBeDefined();
        expect(en.referenceNumberLabel).toBeDefined();
        expect(en.continueButton).toBeDefined();
        expect(en.errorRequired).toBeDefined();
        expect(en.errorNoResults).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
      });

      it("should have correct title", () => {
        expect(en.title).toBe("What is the reference number?");
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });

      it("should have Welsh translations", () => {
        expect(cy.title).toBe("Beth yw'r rhif cyfeirnod?");
        expect(cy.continueButton).toBe("Parhau");
      });
    });
  });

  describe("GET", () => {
    it("should render page with English translations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
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
        "case-number-search/index",
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
    it("should show validation error when reference number is empty", async () => {
      mockReq.body = { referenceNumber: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorNoResults,
              href: "#referenceNumber"
            })
          ]),
          fieldErrors: expect.objectContaining({
            referenceNumber: expect.objectContaining({ text: en.errorNoResultsField })
          })
        })
      );
    });

    it("should show validation error when reference number is whitespace only", async () => {
      mockReq.body = { referenceNumber: "   " };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorNoResults
            })
          ])
        })
      );
    });

    it("should redirect to results page when cases are found", async () => {
      const mockResults = [
        { id: "1", caseNumber: "12341234", caseName: "Test Case", artefactId: "art1" },
        { id: "2", caseNumber: "12341234", caseName: "Another Case", artefactId: "art2" }
      ];
      vi.mocked(searchByCaseReference).mockResolvedValue(mockResults);
      mockReq.body = { referenceNumber: "12341234" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(searchByCaseReference).toHaveBeenCalledWith("12341234");
      expect(mockReq.session.caseSearch?.numberResults).toEqual(mockResults);
      expect(mockRes.redirect).toHaveBeenCalledWith("/case-number-search-results");
    });

    it("should show no results error when no cases are found", async () => {
      vi.mocked(searchByCaseReference).mockResolvedValue([]);
      mockReq.body = { referenceNumber: "NONEXISTENT" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: en.errorNoResults,
              href: "#referenceNumber"
            })
          ]),
          fieldErrors: expect.objectContaining({
            referenceNumber: expect.objectContaining({ text: en.errorNoResultsField })
          }),
          data: expect.objectContaining({ referenceNumber: "NONEXISTENT" })
        })
      );
    });

    it("should handle search errors", async () => {
      vi.mocked(searchByCaseReference).mockRejectedValue(new Error("Database error"));
      mockReq.body = { referenceNumber: "12341234" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: "An error occurred while searching"
            })
          ]),
          data: expect.objectContaining({ referenceNumber: "12341234" })
        })
      );
    });

    it("should initialize caseSearch in session if not present", async () => {
      const mockResults = [{ id: "1", caseNumber: "12341234", caseName: "Test", artefactId: "art1" }];
      vi.mocked(searchByCaseReference).mockResolvedValue(mockResults);
      mockReq.session = {} as any;
      mockReq.body = { referenceNumber: "12341234" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.caseSearch).toBeDefined();
      expect(mockReq.session.caseSearch?.numberResults).toEqual(mockResults);
    });

    it("should show Welsh error messages when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = { referenceNumber: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-number-search/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: cy.errorNoResults
            })
          ])
        })
      );
    });
  });
});
