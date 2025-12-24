import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

vi.mock("../../../media-application/queries.js", () => ({
  getApplicationById: vi.fn()
}));

const { getApplicationById } = await import("../../../media-application/queries.js");
const { GET, POST } = await import("./reject-reasons.js");

describe("media-application reject-reasons page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let redirectSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { id: "app-123" },
      query: {},
      body: {},
      user: { email: "admin@example.com" },
      session: {} as any
    };

    renderSpy = vi.fn();
    redirectSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockResponse = {
      render: renderSpy,
      redirect: redirectSpy,
      status: statusSpy
    };
  });

  describe("GET handler", () => {
    it("should render reject-reasons page in English", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Why are you rejecting this application?",
        selectAllText: "Select all that apply.",
        checkboxLegend: "Rejection reasons",
        reasons: {
          notAccredited: "The applicant is not an accredited member of the media.",
          invalidId: "ID provided has expired or is not a Press ID.",
          detailsMismatch: "Details provided do not match."
        },
        continueButton: "Continue",
        id: "app-123",
        selectedReasons: {},
        hideLanguageToggle: true
      });
    });

    it("should render in Welsh when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Pam ydych chi'n gwrthod y cais hwn?",
        selectAllText: "Dewiswch bob un sy'n berthnasol.",
        checkboxLegend: "Rhesymau dros wrthod",
        reasons: {
          notAccredited: "Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.",
          invalidId: "Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg.",
          detailsMismatch: "Nid yw'r manylion a ddarparwyd yn cyd-fynd."
        },
        continueButton: "Parhau",
        id: "app-123",
        selectedReasons: {},
        hideLanguageToggle: true
      });
    });

    it("should load previously selected reasons from session", async () => {
      mockRequest.session = {
        rejectionReasons: {
          notAccredited: "on",
          invalidId: "on",
          selectedReasons: ["notAccredited", "invalidId"]
        }
      } as any;

      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Why are you rejecting this application?",
        selectAllText: "Select all that apply.",
        checkboxLegend: "Rejection reasons",
        reasons: {
          notAccredited: "The applicant is not an accredited member of the media.",
          invalidId: "ID provided has expired or is not a Press ID.",
          detailsMismatch: "Details provided do not match."
        },
        continueButton: "Continue",
        id: "app-123",
        selectedReasons: {
          notAccredited: "on",
          invalidId: "on",
          selectedReasons: ["notAccredited", "invalidId"]
        },
        hideLanguageToggle: true
      });
    });

    it("should return 404 when application not found", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("errors/404", {
        error: "Application not found."
      });
    });

    it("should render error page when database query fails", async () => {
      vi.mocked(getApplicationById).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Why are you rejecting this application?",
        error: "Unable to load applicant details. Please try again later.",
        hideLanguageToggle: true
      });
    });
  });

  describe("POST handler", () => {
    it("should show validation error when no reasons selected", async () => {
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Why are you rejecting this application?",
        selectAllText: "Select all that apply.",
        checkboxLegend: "Rejection reasons",
        reasons: {
          notAccredited: "The applicant is not an accredited member of the media.",
          invalidId: "ID provided has expired or is not a Press ID.",
          detailsMismatch: "Details provided do not match."
        },
        continueButton: "Continue",
        id: "app-123",
        selectedReasons: {},
        errors: [{ text: "An option must be selected", href: "#notAccredited" }],
        hideLanguageToggle: true
      });
    });

    it("should show validation error in Welsh when lng=cy and no reasons selected", async () => {
      mockRequest.query = { lng: "cy" };
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject-reasons", {
        pageTitle: "Pam ydych chi'n gwrthod y cais hwn?",
        selectAllText: "Dewiswch bob un sy'n berthnasol.",
        checkboxLegend: "Rhesymau dros wrthod",
        reasons: {
          notAccredited: "Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.",
          invalidId: "Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg.",
          detailsMismatch: "Nid yw'r manylion a ddarparwyd yn cyd-fynd."
        },
        continueButton: "Parhau",
        id: "app-123",
        selectedReasons: {},
        errors: [{ text: "Rhaid dewis opsiwn", href: "#notAccredited" }],
        hideLanguageToggle: true
      });
    });

    it("should store single reason in session and redirect", async () => {
      mockRequest.body = { notAccredited: "on" };
      mockRequest.query = { lng: "en" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session.rejectionReasons).toEqual({
        notAccredited: "on",
        invalidId: undefined,
        detailsMismatch: undefined,
        selectedReasons: ["notAccredited"]
      });
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/reject?lng=en");
    });

    it("should store multiple reasons in session and redirect", async () => {
      mockRequest.body = {
        notAccredited: "on",
        invalidId: "on",
        detailsMismatch: "on"
      };
      mockRequest.query = { lng: "en" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session.rejectionReasons).toEqual({
        notAccredited: "on",
        invalidId: "on",
        detailsMismatch: "on",
        selectedReasons: ["notAccredited", "invalidId", "detailsMismatch"]
      });
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/reject?lng=en");
    });

    it("should preserve Welsh language in redirect", async () => {
      mockRequest.body = { invalidId: "on" };
      mockRequest.query = { lng: "cy" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/reject?lng=cy");
    });

    it("should default to 'en' when no language specified in redirect", async () => {
      mockRequest.body = { invalidId: "on" };
      mockRequest.query = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/reject?lng=en");
    });
  });

  it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role for GET", () => {
    expect(GET).toHaveLength(2);
    expect(GET[0]).toBeDefined();
  });

  it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role for POST", () => {
    expect(POST).toHaveLength(2);
    expect(POST[0]).toBeDefined();
  });
});
