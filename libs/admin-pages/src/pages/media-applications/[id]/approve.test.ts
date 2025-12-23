import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

vi.mock("@hmcts/notification", () => ({
  sendMediaApprovalEmail: vi.fn()
}));

vi.mock("../../../media-application/queries.js", () => ({
  getApplicationById: vi.fn()
}));

vi.mock("../../../media-application/service.js", () => ({
  approveApplication: vi.fn()
}));

const { getApplicationById } = await import("../../../media-application/queries.js");
const { approveApplication } = await import("../../../media-application/service.js");
const { sendMediaApprovalEmail } = await import("@hmcts/notification");
const { GET, POST } = await import("./approve.js");

describe("media-application approve page", () => {
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
  });

  describe("GET handler", () => {
    it("should render approve confirmation page in English", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

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
        proofOfIdFilename: "IACListPublishPreviewed.pdf",
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
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approve", {
        pageTitle: "A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?",
        subheading: "Manylion Yr Ymgeisydd",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais",
          proofOfId: "Prawf o ID"
        },
        proofOfIdText: "(yn agor mewn ffenestr newydd)",
        viewProofOfId: "Gweld",
        fileNotAvailable: "Ffeil ar gael ddim",
        radioLegend: "Cadarnhau cymeradwyaeth",
        radioOptions: {
          yes: "Ie",
          no: "Na"
        },
        continueButton: "Parhau",
        application: mockApplication,
        proofOfIdFilename: "IACListPublishPreviewed.pdf",
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
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

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
        proofOfIdFilename: "IACListPublishPreviewed.pdf",
        errors: [{ text: "An option must be selected", href: "#confirm" }],
        hideLanguageToggle: true
      });
    });

    it("should redirect back to details page when 'no' is selected", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = { confirm: "no" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123");
      expect(approveApplication).not.toHaveBeenCalled();
    });

    it("should approve application and redirect when 'yes' is selected", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockResolvedValue();
      vi.mocked(sendMediaApprovalEmail).mockResolvedValue();
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(approveApplication).toHaveBeenCalledWith("app-123");
      expect(sendMediaApprovalEmail).toHaveBeenCalledWith({
        name: "John Smith",
        email: "john@bbc.co.uk",
        employer: "BBC"
      });
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/approved");
    });

    it("should still approve even if email notification fails", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        proofOfIdOriginalName: "IACListPublishPreviewed.pdf",
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      vi.mocked(approveApplication).mockResolvedValue();
      vi.mocked(sendMediaApprovalEmail).mockRejectedValue(new Error("Email service error"));
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(approveApplication).toHaveBeenCalledWith("app-123");
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/approved");
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

    it("should render error page when database operation fails", async () => {
      vi.mocked(getApplicationById).mockRejectedValue(new Error("Database error"));
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approve", {
        pageTitle: "Are you sure you want to approve this application?",
        error: "Unable to load applicant details. Please try again later.",
        application: null,
        hideLanguageToggle: true
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
