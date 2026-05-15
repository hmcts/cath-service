import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  searchByCaseNumber: vi.fn()
}));

import { searchByCaseNumber } from "@hmcts/subscriptions";

describe("case-reference-search", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/case-reference-search",
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
        "case-reference-search/index",
        expect.objectContaining({
          heading: "What is the reference number?",
          caseReference: ""
        })
      );
    });

    it("should render with empty caseReference regardless of session value", async () => {
      mockReq.session = { emailSubscriptions: { caseReferenceSearch: "AB-123" } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("case-reference-search/index", expect.objectContaining({ caseReference: "" }));
    });

    it("should render Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-reference-search/index",
        expect.objectContaining({
          heading: "Beth yw'r cyfeirnod?"
        })
      );
    });
  });

  describe("POST", () => {
    it("should re-render with error when reference is empty", async () => {
      mockReq.body = { caseReference: "" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-reference-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "There is nothing matching your criteria" })]),
            inlineError: "Enter a valid case reference number"
          })
        })
      );
    });

    it("should re-render with error when search returns empty array", async () => {
      mockReq.body = { caseReference: "UNKNOWN-999" };
      vi.mocked(searchByCaseNumber).mockResolvedValue([]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-reference-search/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "There is nothing matching your criteria" })]),
            inlineError: "Enter a valid case reference number"
          })
        })
      );
    });

    it("should store results in session and redirect when results found", async () => {
      mockReq.body = { caseReference: "AB-123" };
      const results = [{ caseNumber: "AB-123", caseName: "Smith v Jones" }];
      vi.mocked(searchByCaseNumber).mockResolvedValue(results);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.caseSearchResults).toEqual(results);
      expect(mockReq.session?.emailSubscriptions?.caseReferenceSearch).toBe("AB-123");
      expect(mockReq.session?.emailSubscriptions?.searchSource).toBe("/case-reference-search");
      expect(mockRes.redirect).toHaveBeenCalledWith("/case-search-results");
    });
  });
});
