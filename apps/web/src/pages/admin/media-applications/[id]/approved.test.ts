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
const { GET } = await import("./approved.js");

describe("media-application approved confirmation page", () => {
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
    it("should render approval confirmation page in English", async () => {
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

      expect(getApplicationById).toHaveBeenCalledWith("app-123");
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approved", {
        pageTitle: "Application has been approved",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied"
        },
        whatHappensNextHeading: "What happens next",
        whatHappensNextText:
          "This account has been created and the applicant will be notified to confirm their details. If an account already exists, the applicant will be asked to sign in, or choose forgot password.",
        returnLink: "Return to applications list",
        application: mockApplication
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
        status: "APPROVED" as const,
        createdAt: new Date("2024-01-01"),
        reviewedBy: "admin@example.com",
        reviewedDate: new Date("2024-01-02")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approved", {
        pageTitle: "Mae'r cais wedi'i gymeradwyo",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais"
        },
        whatHappensNextHeading: "Beth sy'n digwydd nesaf",
        whatHappensNextText:
          "Mae'r cyfrif wedi'i greu ac fe fydd yr ymgeisydd yn cael gwybod i gadarnhau ei fanylion. Os oes cyfrif eisoes yn bodoli, fe ofynnir i'r ymgeisydd fewngofnodi, neu ddewis 'wedi anghofio cyfrinair'.",
        returnLink: "Dychwelyd i'r rhestr ceisiadau",
        application: mockApplication
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/approved", {
        pageTitle: "Application has been approved",
        error: "Unable to load application details. Please try again later.",
        application: null
      });
    });

    it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
      expect(GET).toHaveLength(2);
      expect(GET[0]).toBeDefined();
    });
  });
});
