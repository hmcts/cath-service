import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscriptions", () => ({
  savePendingCaseSubscriptions: vi.fn()
}));

import { savePendingCaseSubscriptions } from "@hmcts/subscriptions";

describe("case-search-results", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  const mockResults = [
    { caseNumber: "AB-456", caseName: "Brown v Crown" },
    { caseNumber: "AB-123", caseName: "Adams v Jones" },
    { caseNumber: "AB-789", caseName: "Smith v Crown" }
  ];

  beforeEach(() => {
    mockReq = {
      body: {},
      path: "/case-search-results",
      user: { id: "user-123" } as any,
      app: { locals: { redisClient: {} } } as any,
      session: {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-name-search"
        }
      } as any
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
    it("should render results sorted alphabetically by case name", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-search-results/index",
        expect.objectContaining({
          heading: "Subscription case search results",
          results: [
            { caseNumber: "AB-123", caseName: "Adams v Jones" },
            { caseNumber: "AB-456", caseName: "Brown v Crown" },
            { caseNumber: "AB-789", caseName: "Smith v Crown" }
          ]
        })
      );
    });

    it("should redirect to searchSource when session results are missing", async () => {
      mockReq.session = { emailSubscriptions: { searchSource: "/case-name-search" } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/case-name-search");
    });

    it("should redirect to add-email-subscription when both results and searchSource are missing", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/add-email-subscription");
    });

    it("should render Welsh content when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("case-search-results/index", expect.objectContaining({ heading: "Canlyniadau chwilio achos tanysgrifiad" }));
    });
  });

  describe("POST", () => {
    it("should re-render with error when no case selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "case-search-results/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Select a case" })])
          })
        })
      );
    });

    it("should store pendingCaseSubscriptions with CASE_NAME type and redirect when source is case-name-search", async () => {
      mockReq.session = {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-name-search"
        }
      } as any;
      mockReq.body = { selectedCase: "Smith v Jones|||AB-123" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME",
          searchValue: "Smith v Jones"
        }
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should store pendingCaseSubscriptions with CASE_NUMBER type when source is case-reference-search", async () => {
      mockReq.session = {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-reference-search"
        }
      } as any;
      mockReq.body = { selectedCase: "Smith v Jones|||AB-123" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NUMBER",
          searchValue: "AB-123"
        }
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should save pendingCaseSubscriptions to Redis after storing in session", async () => {
      mockReq.body = { selectedCase: "Smith v Jones|||AB-123" };
      vi.mocked(savePendingCaseSubscriptions).mockResolvedValue(undefined);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(savePendingCaseSubscriptions).toHaveBeenCalledWith(
        mockReq.app?.locals.redisClient,
        "user-123",
        expect.arrayContaining([expect.objectContaining({ caseName: "Smith v Jones", caseNumber: "AB-123" })])
      );
    });

    it("should preserve existing pendingCaseSubscriptions by moving them to confirmedCaseSubscriptions", async () => {
      const existingCase = { caseName: "Adams v Jones", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Adams v Jones" };
      mockReq.session = {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-name-search",
          pendingCaseSubscriptions: [existingCase]
        }
      } as any;
      mockReq.body = { selectedCase: "Brown v Crown|||AB-456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toEqual([existingCase]);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME", searchValue: "Brown v Crown" }
      ]);
    });

    it("should merge existing confirmedCaseSubscriptions and pendingCaseSubscriptions when adding a new case", async () => {
      const confirmedCase = { caseName: "Adams v Jones", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Adams v Jones" };
      const pendingCase = { caseName: "Smith v Jones", caseNumber: "AB-111", searchType: "CASE_NUMBER" as const, searchValue: "AB-111" };
      mockReq.session = {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-name-search",
          confirmedCaseSubscriptions: [confirmedCase],
          pendingCaseSubscriptions: [pendingCase]
        }
      } as any;
      mockReq.body = { selectedCase: "Brown v Crown|||AB-456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toEqual([confirmedCase, pendingCase]);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME", searchValue: "Brown v Crown" }
      ]);
    });

    it("should store multiple pendingCaseSubscriptions when multiple cases selected", async () => {
      mockReq.session = {
        emailSubscriptions: {
          caseSearchResults: mockResults,
          searchSource: "/case-name-search"
        }
      } as any;
      mockReq.body = { selectedCase: ["Adams v Jones|||AB-123", "Brown v Crown|||AB-456"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        {
          caseName: "Adams v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME",
          searchValue: "Adams v Jones"
        },
        {
          caseName: "Brown v Crown",
          caseNumber: "AB-456",
          searchType: "CASE_NAME",
          searchValue: "Brown v Crown"
        }
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });
  });
});
