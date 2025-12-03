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
const { GET } = await import("./index.js");

describe("media-application details page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { id: "app-123" },
      query: {}
    };

    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockResponse = {
      render: renderSpy,
      status: statusSpy
    };
  });

  describe("GET handler", () => {
    it("should render application details in English", async () => {
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
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/index", {
        pageTitle: "Applicant's details",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied",
          proofOfId: "Proof of ID"
        },
        proofOfIdText: "(opens in a new window)",
        viewProofOfId: "View",
        approveButton: "Approve application",
        rejectButton: "Reject application",
        fileNotAvailable: "File not available",
        application: mockApplication,
        proofOfIdFilename: "IACListPublishPreviewed.pdf",
        hideLanguageToggle: true
      });
    });

    it("should render application details in Welsh when lng=cy", async () => {
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/index", {
        pageTitle: "Manylion yr ymgeisydd",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais",
          proofOfId: "Prawf o ID"
        },
        proofOfIdText: "(yn agor mewn ffenestr newydd)",
        viewProofOfId: "Gweld",
        approveButton: "Cymeradwyo cais",
        rejectButton: "Gwrthod cais",
        fileNotAvailable: "Ffeil ar gael ddim",
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

    it("should show error when application has already been reviewed", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "APPROVED" as const,
        createdAt: new Date("2024-01-01"),
        reviewedBy: "admin@example.com",
        reviewedDate: new Date("2024-01-02")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/index", {
        pageTitle: "Applicant's details",
        error: "This application has already been reviewed.",
        application: null,
        hideLanguageToggle: true
      });
    });

    it("should show error when application is rejected", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "REJECTED" as const,
        createdAt: new Date("2024-01-01"),
        reviewedBy: "admin@example.com",
        reviewedDate: new Date("2024-01-02")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/index", {
        pageTitle: "Applicant's details",
        error: "This application has already been reviewed.",
        application: null,
        hideLanguageToggle: true
      });
    });

    it("should render error page when database query fails", async () => {
      vi.mocked(getApplicationById).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/index", {
        pageTitle: "Applicant's details",
        error: "Unable to load applicant details. Please try again later.",
        application: null,
        hideLanguageToggle: true
      });
    });

    it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
      expect(GET).toHaveLength(2);
      expect(GET[0]).toBeDefined();
    });
  });
});
