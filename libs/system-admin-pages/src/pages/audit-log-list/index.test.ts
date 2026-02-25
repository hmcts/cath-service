import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaginatedAuditLogs } from "../../audit-log/service.js";
import { GET } from "./index.js";

vi.mock("../../audit-log/service.js", () => ({
  getAuditLogs: vi.fn(),
  getAvailableActions: vi.fn(),
  validateEmail: vi.fn(),
  validateUserId: vi.fn(),
  parseDate: vi.fn()
}));

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("audit-log-list page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let auditLogService: any;

  beforeEach(async () => {
    auditLogService = await import("../../audit-log/service.js");

    mockRequest = {
      query: {}
    };

    mockResponse = {
      render: vi.fn(),
      locals: { locale: "en" }
    };

    vi.clearAllMocks();

    // Default mock implementations
    auditLogService.getAuditLogs.mockResolvedValue({
      logs: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,
      totalPages: 0
    } as PaginatedAuditLogs);

    auditLogService.getAvailableActions.mockResolvedValue([
      { value: "ADD_JURISDICTION", text: "Add Jurisdiction" },
      { value: "DELETE_COURT", text: "Delete Court" }
    ]);

    auditLogService.validateEmail.mockReturnValue(true);
    auditLogService.validateUserId.mockReturnValue(true);
    auditLogService.parseDate.mockReturnValue(new Date("2026-01-21"));
  });

  describe("GET handler", () => {
    it("should render audit log list with no filters", async () => {
      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({}, 1);
      expect(auditLogService.getAvailableActions).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          logs: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
          filters: {
            email: "",
            userId: "",
            day: "",
            month: "",
            year: "",
            actions: []
          },
          errors: null,
          errorList: null
        })
      );
    });

    it("should apply email filter when valid", async () => {
      mockRequest.query = { email: "admin@justice.gov.uk" };
      auditLogService.validateEmail.mockReturnValue(true);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.validateEmail).toHaveBeenCalledWith("admin@justice.gov.uk");
      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({ email: "admin@justice.gov.uk" }, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          filters: expect.objectContaining({
            email: "admin@justice.gov.uk"
          }),
          errors: null
        })
      );
    });

    it("should show error for invalid email", async () => {
      mockRequest.query = { email: "invalid-email" };
      auditLogService.validateEmail.mockReturnValue(false);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            email: expect.objectContaining({
              text: expect.any(String),
              href: "#email"
            })
          }),
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              href: "#email"
            })
          ])
        })
      );
    });

    it("should apply userId filter when valid", async () => {
      mockRequest.query = { userId: "user123" };
      auditLogService.validateUserId.mockReturnValue(true);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.validateUserId).toHaveBeenCalledWith("user123");
      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({ userId: "user123" }, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          filters: expect.objectContaining({
            userId: "user123"
          }),
          errors: null
        })
      );
    });

    it("should show error for invalid userId", async () => {
      mockRequest.query = { userId: "invalid@user" };
      auditLogService.validateUserId.mockReturnValue(false);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            userId: expect.objectContaining({
              text: expect.any(String),
              href: "#userId"
            })
          })
        })
      );
    });

    it("should apply date filter when valid", async () => {
      mockRequest.query = { day: "21", month: "01", year: "2026" };
      const testDate = new Date("2026-01-21");
      auditLogService.parseDate.mockReturnValue(testDate);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.parseDate).toHaveBeenCalledWith("21", "01", "2026");
      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({ date: testDate }, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          filters: expect.objectContaining({
            day: "21",
            month: "01",
            year: "2026"
          }),
          errors: null
        })
      );
    });

    it("should show error for incomplete date", async () => {
      mockRequest.query = { day: "21", month: "01" }; // Missing year

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            date: expect.objectContaining({
              text: expect.any(String),
              href: "#day"
            })
          })
        })
      );
    });

    it("should show error for invalid date", async () => {
      mockRequest.query = { day: "32", month: "13", year: "2026" };
      auditLogService.parseDate.mockReturnValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            date: expect.objectContaining({
              text: expect.any(String),
              href: "#day"
            })
          })
        })
      );
    });

    it("should apply actions filter with single action", async () => {
      mockRequest.query = { actions: "ADD_JURISDICTION" };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({ actions: ["ADD_JURISDICTION"] }, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          filters: expect.objectContaining({
            actions: ["ADD_JURISDICTION"]
          })
        })
      );
    });

    it("should apply actions filter with multiple actions", async () => {
      mockRequest.query = { actions: ["ADD_JURISDICTION", "DELETE_COURT"] };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({ actions: ["ADD_JURISDICTION", "DELETE_COURT"] }, 1);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          filters: expect.objectContaining({
            actions: ["ADD_JURISDICTION", "DELETE_COURT"]
          })
        })
      );
    });

    it("should handle pagination", async () => {
      mockRequest.query = { page: "3" };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({}, 3);
    });

    it("should default to page 1 for invalid page number", async () => {
      mockRequest.query = { page: "invalid" };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith({}, 1);
    });

    it("should apply multiple filters together", async () => {
      mockRequest.query = {
        email: "admin@justice.gov.uk",
        userId: "user123",
        day: "21",
        month: "01",
        year: "2026",
        actions: ["ADD_JURISDICTION"],
        page: "2"
      };

      auditLogService.validateEmail.mockReturnValue(true);
      auditLogService.validateUserId.mockReturnValue(true);
      const testDate = new Date("2026-01-21");
      auditLogService.parseDate.mockReturnValue(testDate);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        {
          email: "admin@justice.gov.uk",
          userId: "user123",
          date: testDate,
          actions: ["ADD_JURISDICTION"]
        },
        2
      );
    });

    it("should use Welsh content when locale is cy", async () => {
      mockResponse.locals = { locale: "cy" };

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          cy: expect.any(Object),
          title: expect.any(String)
        })
      );
    });

    it("should render with audit logs when data exists", async () => {
      const mockLogs = [
        {
          id: "1",
          timestamp: "21/01/2026 10:30:00",
          action: "Add Jurisdiction",
          userEmail: "admin@justice.gov.uk",
          userId: "user123",
          userRole: "SYSTEM_ADMIN",
          userProvenance: "azure-ad",
          details: "Name: Family Law"
        }
      ];

      auditLogService.getAuditLogs.mockResolvedValue({
        logs: mockLogs,
        totalCount: 1,
        currentPage: 1,
        pageSize: 50,
        totalPages: 1
      } as PaginatedAuditLogs);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-list/index",
        expect.objectContaining({
          logs: mockLogs,
          totalCount: 1,
          currentPage: 1,
          totalPages: 1
        })
      );
    });
  });
});
