import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  searchByCaseName: vi.fn()
}));

import { searchByCaseName } from "@hmcts/subscriptions";

describe("case-name-search", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/case-name-search",
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
    it("should render the form", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          heading: "What is the name of the case?",
          caseNameLabel: "Case name",
          caseName: ""
        })
      );
    });

    it("should render with empty caseName regardless of session value", async () => {
      mockReq.session = { emailSubscriptions: { caseNameSearch: "Smith v Jones" } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("case-name-search/index", expect.objectContaining({ caseName: "" }));
    });

    it("should render Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("case-name-search/index", expect.objectContaining({ heading: "Beth yw enw'r achos?" }));
    });
  });

  describe("POST", () => {
    it("should re-render with min-length error when case name is empty", async () => {
      mockReq.body = { caseName: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please enter a minimum of 3 characters" })])
          })
        })
      );
    });

    it("should re-render with min-length error when case name is whitespace only", async () => {
      mockReq.body = { caseName: "   " };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please enter a minimum of 3 characters" })])
          })
        })
      );
    });

    it("should re-render with min-length error when case name is fewer than 3 characters", async () => {
      mockReq.body = { caseName: "AB" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please enter a minimum of 3 characters" })])
          })
        })
      );
    });

    it("should re-render with no-results error when search returns empty array", async () => {
      mockReq.body = { caseName: "Unknown Case" };
      vi.mocked(searchByCaseName).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-name-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "There is nothing matching your criteria" })]),
            inlineError: "Please provide a correct case name"
          })
        })
      );
    });

    it("should store results in session and redirect when results found", async () => {
      mockReq.body = { caseName: "Smith" };
      const results = [{ caseNumber: "AB-123", caseName: "Smith v Jones" }];
      vi.mocked(searchByCaseName).mockResolvedValue(results);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.caseSearchResults).toEqual(results);
      expect(mockReq.session?.emailSubscriptions?.caseNameSearch).toBe("Smith");
      expect(mockReq.session?.emailSubscriptions?.searchSource).toBe("/case-name-search");
      expect(mockRes.redirect).toHaveBeenCalledWith("/case-search-results");
    });
  });
});
