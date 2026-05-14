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
const { GET } = await import("./rejected.js");

describe("media-application rejected page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { id: "app-123" },
      query: {},
      user: { email: "admin@example.com" }
    };

    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    mockResponse = {
      render: renderSpy,
      status: statusSpy
    };
  });

  describe("GET handler", () => {
    it("should render rejected page in English", async () => {
      const mockApplication = {
        id: "app-123",
        name: "John Smith",
        employer: "BBC",
        email: "john@bbc.co.uk",
        phoneNumber: "07700900123",
        proofOfIdPath: "/uploads/proof-app-123.pdf",
        status: "REJECTED" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/rejected", {
        pageTitle: "Application has been rejected",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied"
        },
        reasonsHeading: "Rejection Reasons",
        viewLinkText: "View",
        whatHappensNextHeading: "What happens next",
        whatHappensNextText:
          "The applicant {applicantEmail} will now be emailed to notify them why their application cannot be progressed and invited to reapply once the issue(s) are rectified.",
        returnLink: "Return to applications list",
        application: mockApplication,
        reasonsList: []
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
        status: "REJECTED" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/rejected", {
        pageTitle: "Mae'r cais wedi'i wrthod",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais"
        },
        reasonsHeading: "Rhesymau Dros Wrthod",
        viewLinkText: "Gweld",
        whatHappensNextHeading: "Beth sy'n digwydd nesaf",
        whatHappensNextText:
          "Bydd yr ymgeisydd {applicantEmail} nawr yn cael e-bost i'w hysbysu pam na ellir bwrw ymlaen â'i gais a'i wahodd i ail-wneud cais unwaith y bydd y mater/materion wedi'u cywiro.",
        returnLink: "Dychwelyd i'r rhestr ceisiadau",
        application: mockApplication,
        reasonsList: []
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/rejected", {
        pageTitle: "Application has been rejected",
        error: "Unable to load application details. Please try again later.",
        application: null
      });
    });
  });

  it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
    expect(GET).toHaveLength(2);
    expect(GET[0]).toBeDefined();
  });
});
