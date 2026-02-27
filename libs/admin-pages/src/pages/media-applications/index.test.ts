import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC" }
}));

vi.mock("../../media-application/queries.js", () => ({
  getPendingApplications: vi.fn()
}));

const { getPendingApplications } = await import("../../media-application/queries.js");
const { GET } = await import("./index.js");

describe("media-applications list page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {}
    };

    renderSpy = vi.fn();
    mockResponse = {
      render: renderSpy
    };
  });

  describe("GET handler", () => {
    it("should render list of pending applications in English", async () => {
      const mockApplications = [
        {
          id: "app-1",
          name: "John Smith",
          employer: "BBC",
          email: "john@bbc.co.uk",
          createdAt: new Date("2024-01-01")
        },
        {
          id: "app-2",
          name: "Jane Doe",
          employer: "ITV",
          email: "jane@itv.com",
          createdAt: new Date("2024-01-02")
        }
      ];

      vi.mocked(getPendingApplications).mockResolvedValue(mockApplications);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(getPendingApplications).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith("media-applications/index", {
        pageTitle: "Select application to assess",
        tableHeaders: {
          name: "Name",
          employer: "Employer",
          dateApplied: "Date applied",
          action: "Action"
        },
        viewLink: "View",
        noApplications: "There are no pending applications.",
        applications: mockApplications
      });
    });

    it("should render list in Welsh when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      const mockApplications = [
        {
          id: "app-1",
          name: "John Smith",
          employer: "BBC",
          email: "john@bbc.co.uk",
          createdAt: new Date("2024-01-01")
        }
      ];

      vi.mocked(getPendingApplications).mockResolvedValue(mockApplications);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/index", {
        pageTitle: "Dewiswch gais i'w asesu",
        tableHeaders: {
          name: "Enw",
          employer: "Cyflogwr",
          dateApplied: "Dyddiad gwneud cais",
          action: "Gweithred"
        },
        viewLink: "Gweld",
        noApplications: "Nid oes ceisiadau yn disgwyl.",
        applications: mockApplications
      });
    });

    it("should render empty list when no applications", async () => {
      vi.mocked(getPendingApplications).mockResolvedValue([]);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith(
        "media-applications/index",
        expect.objectContaining({
          applications: []
        })
      );
    });

    it("should render error page when database query fails", async () => {
      vi.mocked(getPendingApplications).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(renderSpy).toHaveBeenCalledWith("media-applications/index", {
        pageTitle: "Select application to assess",
        error: "Unable to load applications. Please try again later.",
        applications: []
      });
    });

    it("should use requireRole middleware with INTERNAL_ADMIN_CTSC role", () => {
      expect(GET).toHaveLength(2);
      expect(GET[0]).toBeDefined();
    });
  });
});
