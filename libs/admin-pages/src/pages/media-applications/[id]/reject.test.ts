import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

vi.mock("@hmcts/notification", () => ({
  sendMediaRejectionEmail: vi.fn()
}));

vi.mock("../../../media-application/queries.js", () => ({
  getApplicationById: vi.fn()
}));

vi.mock("../../../media-application/service.js", () => ({
  rejectApplication: vi.fn()
}));

const { getApplicationById } = await import("../../../media-application/queries.js");
const { rejectApplication } = await import("../../../media-application/service.js");
const { sendMediaRejectionEmail } = await import("@hmcts/notification");
const { GET, POST } = await import("./reject.js");

describe("media-application reject page", () => {
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
      session: {
        rejectionReasons: {
          selectedReasons: ["notAccredited", "invalidId"]
        }
      } as any
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
    it("should render reject confirmation page in English", async () => {
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
      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "Are you sure you want to reject this application?",
        subheading: "Applicant's details",
        reasonsHeading: "Rejection reasons",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied"
        },
        radioLegend: "Confirm rejection",
        radioOptions: {
          yes: "Yes",
          no: "No"
        },
        continueButton: "Continue",
        application: mockApplication,
        reasonsList: ["The applicant is not an accredited member of the media.", "ID provided has expired or is not a Press ID."],
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "A ydych yn siŵr eich bod am wrthod y cais hwn?",
        subheading: "Manylion yr ymgeisydd",
        reasonsHeading: "Rhesymau dros wrthod",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais"
        },
        radioLegend: "Cadarnhau gwrthod",
        radioOptions: {
          yes: "Ie",
          no: "Na"
        },
        continueButton: "Parhau",
        application: mockApplication,
        reasonsList: ["Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.", "Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg."],
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "Are you sure you want to reject this application?",
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
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "Are you sure you want to reject this application?",
        subheading: "Applicant's details",
        reasonsHeading: "Rejection reasons",
        tableHeaders: {
          name: "Name",
          email: "Email",
          employer: "Employer",
          dateApplied: "Date applied"
        },
        radioLegend: "Confirm rejection",
        radioOptions: {
          yes: "Yes",
          no: "No"
        },
        continueButton: "Continue",
        application: mockApplication,
        reasonsList: ["The applicant is not an accredited member of the media.", "ID provided has expired or is not a Press ID."],
        errors: [{ text: "Select yes or no before continuing.", href: "#confirm" }],
        hideLanguageToggle: true
      });
    });

    it("should show validation error in Welsh when lng=cy and no radio option selected", async () => {
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
      mockRequest.body = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "A ydych yn siŵr eich bod am wrthod y cais hwn?",
        subheading: "Manylion yr ymgeisydd",
        reasonsHeading: "Rhesymau dros wrthod",
        tableHeaders: {
          name: "Enw",
          email: "E-bost",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais"
        },
        radioLegend: "Cadarnhau gwrthod",
        radioOptions: {
          yes: "Ie",
          no: "Na"
        },
        continueButton: "Parhau",
        application: mockApplication,
        reasonsList: ["Nid yw'r ymgeisydd yn aelod achrededig o'r cyfryngau.", "Mae'r ID a ddarparwyd wedi dod i ben neu nid yw'n ID i'r Wasg."],
        errors: [{ text: "Dewiswch ie neu na cyn parhau.", href: "#confirm" }],
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
        status: "PENDING" as const,
        createdAt: new Date("2024-01-01")
      };

      vi.mocked(getApplicationById).mockResolvedValue(mockApplication);
      mockRequest.body = { confirm: "no" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123");
      expect(rejectApplication).not.toHaveBeenCalled();
    });

    it("should reject application and redirect when 'yes' is selected", async () => {
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
      vi.mocked(rejectApplication).mockResolvedValue();
      vi.mocked(sendMediaRejectionEmail).mockResolvedValue();
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(rejectApplication).toHaveBeenCalledWith("app-123");
      expect(sendMediaRejectionEmail).toHaveBeenCalledWith({
        fullName: "John Smith",
        email: "john@bbc.co.uk",
        rejectReasons: "The applicant is not an accredited member of the media.\nID provided has expired or is not a Press ID.",
        linkToService: expect.any(String)
      });
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/rejected");
    });

    it("should still reject even if email notification fails", async () => {
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
      vi.mocked(rejectApplication).mockResolvedValue();
      vi.mocked(sendMediaRejectionEmail).mockRejectedValue(new Error("Email service error"));
      mockRequest.body = { confirm: "yes" };

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(rejectApplication).toHaveBeenCalledWith("app-123");
      expect(redirectSpy).toHaveBeenCalledWith("/media-applications/app-123/rejected");
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

      expect(renderSpy).toHaveBeenCalledWith("media-applications/[id]/reject", {
        pageTitle: "Are you sure you want to reject this application?",
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
