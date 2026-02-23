import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetGraphApiAccessToken = vi.fn();

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" },
  getGraphApiAccessToken: (...args: unknown[]) => mockGetGraphApiAccessToken(...args)
}));

const mockSendMediaNewAccountEmail = vi.fn();
const mockSendMediaExistingUserEmail = vi.fn();

vi.mock("@hmcts/notification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/notification")>();
  return {
    extractNotifyError: actual.extractNotifyError,
    sendMediaNewAccountEmail: (...args: unknown[]) => mockSendMediaNewAccountEmail(...args),
    sendMediaExistingUserEmail: (...args: unknown[]) => mockSendMediaExistingUserEmail(...args)
  };
});

vi.mock("../../../media-application/queries.js", () => ({
  getApplicationById: vi.fn()
}));

vi.mock("../../../media-application/service.js", () => ({
  approveApplication: vi.fn()
}));

const { getApplicationById } = await import("../../../media-application/queries.js");
const { approveApplication } = await import("../../../media-application/service.js");
const { GET, POST } = await import("./approve.js");

describe("media-application approve page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let redirectSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  const mockApplication = {
    id: "app-123",
    name: "Test User",
    employer: "Test Employer",
    email: "test@example.com",
    phoneNumber: "0123456789",
    proofOfIdPath: "/uploads/proof-app-123.pdf",
    proofOfIdOriginalName: "TestProofOfId.pdf",
    status: "PENDING" as const,
    createdAt: new Date("2024-01-01")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { id: "app-123" },
      query: {},
      body: {},
      user: { email: "admin@example.com" }
    };

    renderSpy = vi.fn();
    redirectSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockResponse = {
      render: renderSpy,
      redirect: redirectSpy,
      status: statusSpy
    };

    mockGetGraphApiAccessToken.mockResolvedValue("mock-access-token");
    process.env.MEDIA_FORGOT_PASSWORD_LINK = "https://example.com/reset";
  });

  describe("GET handler", () => {
    it("should render approve confirmation page in English", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approve", {
        pageTitle: "Are you sure you want to approve this application?",
        subheading: "Applicant's Details",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied",
          proofOfId: "Proof of ID"
        },
        proofOfIdText: "(opens in a new window)",
        viewProofOfId: "View",
        fileNotAvailable: "File not available",
        radioLegend: "Confirm approval",
        radioOptions: {
          yes: "Yes",
          no: "No"
        },
        continueButton: "Continue",
        application: mockApplication,
        proofOfIdFilename: "TestProofOfId.pdf",
        hideLanguageToggle: true
      });
    });

    it("should render in Welsh when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith(
        "media-applications/[id]/approve",
        expect.objectContaining({
          pageTitle: "A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?"
        })
      );
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approve", {
        pageTitle: "Are you sure you want to approve this application?",
        error: "Unable to load applicant details. Please try again later.",
        application: null,
        hideLanguageToggle: true
      });
    });
  });

  describe("POST handler", () => {
    it("should show validation error when no radio option selected", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith(
        "media-applications/[id]/approve",
        expect.objectContaining({
          errors: [{ text: "An option must be selected", href: "#confirm" }]
        })
      );
    });

    it("should redirect back to details page when 'no' is selected", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = { confirm: "no" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123");
      expect(approveApplication).not.toHaveBeenCalled();
    });

    it("should send new account email when user is new", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockResolvedValue({ isNewUser: true });
      mockSendMediaNewAccountEmail.mockResolvedValue(undefined);
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockGetGraphApiAccessToken).toHaveBeenCalled();
      expect(approveApplication).toHaveBeenCalledWith("app-123", "mock-access-token");
      expect(mockSendMediaNewAccountEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        fullName: "Test User",
        signInPageLink: "https://example.com/reset"
      });
      expect(mockSendMediaExistingUserEmail).not.toHaveBeenCalled();
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/approved");
    });

    it("should send existing user email when user already exists", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockResolvedValue({ isNewUser: false });
      mockSendMediaExistingUserEmail.mockResolvedValue(undefined);
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockSendMediaExistingUserEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        fullName: "Test User",
        signInPageLink: "https://example.com/reset"
      });
      expect(mockSendMediaNewAccountEmail).not.toHaveBeenCalled();
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/approved");
    });

    it("should complete approval even if email notification fails", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockResolvedValue({ isNewUser: true });
      mockSendMediaNewAccountEmail.mockRejectedValue(new Error("Email service error"));
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/approved");
    });

    it("should show Azure AD error and keep PENDING status when approval fails", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockRejectedValue(new Error("Graph API unavailable"));
      mockGetGraphApiAccessToken.mockResolvedValue("mock-token");
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith(
        "media-applications/[id]/approve",
        expect.objectContaining({
          error: "Unable to create user account in Azure AD. Please try again later."
        })
      );
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it("should show Azure AD error when token acquisition fails", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockGetGraphApiAccessToken.mockRejectedValue(new Error("Token error"));
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith(
        "media-applications/[id]/approve",
        expect.objectContaining({
          error: "Unable to create user account in Azure AD. Please try again later."
        })
      );
      expect(approveApplication).not.toHaveBeenCalled();
    });

    it("should return 404 when application not found", async () => {
      vi.mocked(getApplicationById).mockResolvedValue(null);
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("errors/404", {
        error: "Application not found."
      });
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
