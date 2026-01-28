import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormattedAuditLog } from "../../audit-log/service.js";
import { GET } from "./index.js";

vi.mock("../../audit-log/service.js", () => ({
  getAuditLogById: vi.fn()
}));

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("audit-log-detail page", () => {
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
      status: vi.fn().mockReturnThis(),
      locals: { locale: "en" }
    };

    vi.clearAllMocks();
  });

  describe("GET handler", () => {
    it("should return 404 when no ID provided", async () => {
      mockRequest.query = {};

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/404",
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });

    it("should return 404 when audit log not found", async () => {
      mockRequest.query = { id: "non-existent-id" };
      auditLogService.getAuditLogById.mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogById).toHaveBeenCalledWith("non-existent-id");
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith(
        "errors/404",
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });

    it("should render audit log detail when found", async () => {
      const mockLog: FormattedAuditLog = {
        id: "log-123",
        timestamp: "21/01/2026 10:30:00",
        action: "Add Jurisdiction",
        userEmail: "admin@justice.gov.uk",
        userId: "user-123",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad",
        details: "Name: Family Law, Welsh Name: Cyfraith Teulu"
      };

      mockRequest.query = { id: "log-123" };
      auditLogService.getAuditLogById.mockResolvedValue(mockLog);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(auditLogService.getAuditLogById).toHaveBeenCalledWith("log-123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-detail/index",
        expect.objectContaining({
          log: mockLog,
          title: expect.any(String),
          userIdLabel: expect.any(String),
          emailLabel: expect.any(String),
          roleLabel: expect.any(String),
          provenanceLabel: expect.any(String),
          actionLabel: expect.any(String),
          detailsLabel: expect.any(String),
          timestampLabel: expect.any(String),
          backToListText: expect.any(String),
          backToTopText: expect.any(String)
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should render audit log detail without details field", async () => {
      const mockLog: FormattedAuditLog = {
        id: "log-456",
        timestamp: "21/01/2026 11:00:00",
        action: "Delete Court",
        userEmail: "admin@justice.gov.uk",
        userId: "user-456",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad"
        // No details field
      };

      mockRequest.query = { id: "log-456" };
      auditLogService.getAuditLogById.mockResolvedValue(mockLog);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-detail/index",
        expect.objectContaining({
          log: mockLog
        })
      );
    });

    it("should use Welsh content when locale is cy", async () => {
      const mockLog: FormattedAuditLog = {
        id: "log-789",
        timestamp: "21/01/2026 12:00:00",
        action: "Add Region",
        userEmail: "admin@justice.gov.uk",
        userId: "user-789",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad",
        details: "Name: London"
      };

      mockRequest.query = { id: "log-789" };
      mockResponse.locals = { locale: "cy" };
      auditLogService.getAuditLogById.mockResolvedValue(mockLog);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-detail/index",
        expect.objectContaining({
          cy: expect.any(Object),
          title: expect.any(String)
        })
      );
    });

    it("should handle all user role types", async () => {
      const mockLog: FormattedAuditLog = {
        id: "log-role-test",
        timestamp: "21/01/2026 13:00:00",
        action: "Upload Reference Data",
        userEmail: "superadmin@justice.gov.uk",
        userId: "user-role-test",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "cft-idam",
        details: "File: reference-data.csv"
      };

      mockRequest.query = { id: "log-role-test" };
      auditLogService.getAuditLogById.mockResolvedValue(mockLog);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-detail/index",
        expect.objectContaining({
          log: expect.objectContaining({
            userRole: "SYSTEM_ADMIN",
            userProvenance: "cft-idam"
          })
        })
      );
    });

    it("should handle long details text", async () => {
      const longDetails =
        "Court: Birmingham Crown Court, Location ID: 123; Status: Completed successfully; Name: Test Jurisdiction; Welsh Name: Awdurdodaeth Prawf; Additional Info: Some very long text that exceeds normal length expectations and contains multiple pieces of information";

      const mockLog: FormattedAuditLog = {
        id: "log-long",
        timestamp: "21/01/2026 14:00:00",
        action: "Delete Court Confirm",
        userEmail: "admin@justice.gov.uk",
        userId: "user-long",
        userRole: "SYSTEM_ADMIN",
        userProvenance: "azure-ad",
        details: longDetails
      };

      mockRequest.query = { id: "log-long" };
      auditLogService.getAuditLogById.mockResolvedValue(mockLog);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "audit-log-detail/index",
        expect.objectContaining({
          log: expect.objectContaining({
            details: longDetails
          })
        })
      );
    });
  });
});
