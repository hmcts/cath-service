import type { UserProfile } from "@hmcts/auth";
import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLogMiddleware } from "./middleware.js";

vi.mock("./logger.js", () => ({
  logAction: vi.fn()
}));

describe("auditLogMiddleware", () => {
  let mockRequest: Partial<Request> & { path: string; method: string };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let logAction: any;

  beforeEach(async () => {
    const loggerModule = await import("./logger.js");
    logAction = loggerModule.logAction;

    mockRequest = {
      method: "POST",
      path: "/add-jurisdiction",
      body: {},
      session: {},
      params: {},
      user: {
        id: "user-123",
        email: "admin@justice.gov.uk",
        displayName: "Admin User",
        role: "SYSTEM_ADMIN",
        provenance: "azure-ad"
      }
    } as any;

    mockResponse = {
      redirect: vi.fn(),
      render: vi.fn(),
      json: vi.fn(),
      send: vi.fn()
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Request filtering", () => {
    it("should not log GET requests", async () => {
      mockRequest.method = "GET";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should log POST requests only on response", async () => {
      mockRequest.method = "POST";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // No initial log created
      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should log PUT requests only on response", async () => {
      mockRequest.method = "PUT";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // No initial log created
      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should log PATCH requests only on response", async () => {
      mockRequest.method = "PATCH";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // No initial log created
      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should log DELETE requests only on response", async () => {
      mockRequest.method = "DELETE";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // No initial log created
      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not log if user is not authenticated", async () => {
      mockRequest.user = undefined;

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not log if user is not SYSTEM_ADMIN", async () => {
      mockRequest.user = {
        id: "user-123",
        email: "user@example.com",
        displayName: "Regular User",
        role: "VERIFIED",
        provenance: "cft-idam"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not log audit-log routes to avoid infinite loops", async () => {
      mockRequest.path = "/audit-log-list";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logAction).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Entity extraction - Layer 2 (Request body)", () => {
    it("should extract name from request body on response", async () => {
      mockRequest.body = {
        name: "Family Law",
        welshName: "Cyfraith Teulu"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          userEmail: "admin@justice.gov.uk",
          action: "ADD_JURISDICTION",
          details: expect.stringContaining("Name: Family Law")
        })
      );
    });

    it("should extract title from request body on response", async () => {
      mockRequest.body = {
        title: "Important Document"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Title: Important Document")
        })
      );
    });

    it("should extract welshName from request body on response", async () => {
      mockRequest.body = {
        name: "Family Law",
        welshName: "Cyfraith Teulu"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Welsh Name: Cyfraith Teulu")
        })
      );
    });

    it("should extract ID fields from request body on response", async () => {
      mockRequest.body = {
        locationId: "123",
        jurisdictionId: "456"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Location Id: 123")
        })
      );
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Jurisdiction Id: 456")
        })
      );
    });

    it("should extract email from request body on response", async () => {
      mockRequest.body = {
        email: "user@example.com"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Email: user@example.com")
        })
      );
    });
  });

  describe("Entity extraction - Layer 3 (URL parameters)", () => {
    it("should extract ID from URL parameters on response", async () => {
      mockRequest.params = {
        id: "789"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Id: 789")
        })
      );
    });
  });

  describe("Entity extraction - Layer 4 (Session)", () => {
    it("should extract court info from deleteCourt session on response", async () => {
      mockRequest.session = {
        deleteCourt: {
          name: "Birmingham Crown Court",
          locationId: 123
        }
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Delete Court: Birmingham Crown Court")
        })
      );
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Location ID: 123")
        })
      );
    });

    it("should extract ID from session object on response", async () => {
      mockRequest.session = {
        customEntity: {
          id: "entity-123",
          name: "Test Entity"
        }
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Custom Entity ID: entity-123")
        })
      );
    });

    it("should extract filename from uploadData session on response", async () => {
      mockRequest.session = {
        uploadData: {
          fileName: "reference-data.csv"
        }
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("File: reference-data.csv")
        })
      );
    });
  });

  describe("Entity extraction - Layer 1 (Explicit metadata)", () => {
    it("should use explicit entityInfo when provided on response", async () => {
      mockRequest.auditMetadata = {
        entityInfo: "Custom Court: Westminster, ID: 123"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Custom Court: Westminster, ID: 123")
        })
      );
    });

    it("should use other auditMetadata fields when entityInfo not provided", async () => {
      mockRequest.auditMetadata = {
        "Court Name": "Custom Court",
        "Custom ID": 999
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Court Name: Custom Court")
        })
      );
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Custom ID: 999")
        })
      );
    });

    it("should skip special control fields in auditMetadata", async () => {
      mockRequest.auditMetadata = {
        shouldLog: true,
        action: "TEST_ACTION",
        entityInfo: "Test Entity",
        "Custom Field": "Custom Value"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Test Entity")
        })
      );
      // Should not include shouldLog, action, or entityInfo as separate fields
      expect(logAction).not.toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("shouldLog:")
        })
      );
    });
  });

  describe("Action name generation", () => {
    it("should generate action name from path on response", async () => {
      mockRequest.path = "/add-jurisdiction";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADD_JURISDICTION"
        })
      );
    });

    it("should handle paths with multiple segments on response", async () => {
      mockRequest.path = "/delete-court-confirm";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response to log
      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE_COURT_CONFIRM"
        })
      );
    });
  });

  describe("Response handling", () => {
    it("should handle redirect with status code and URL when shouldLog flag is set", async () => {
      mockRequest.path = "/add-jurisdiction";
      mockRequest.auditMetadata = {
        shouldLog: true
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger redirect with status code
      (mockResponse.redirect as any)(302, "/add-jurisdiction-success");

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADD_JURISDICTION",
          details: expect.stringContaining("Status: Completed successfully")
        })
      );
    });

    it("should not log redirect to success page without shouldLog flag", async () => {
      mockRequest.path = "/add-jurisdiction";

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger redirect without shouldLog flag
      (mockResponse.redirect as any)("/add-jurisdiction-success");

      expect(logAction).not.toHaveBeenCalled();
    });

    it("should use custom action name from auditMetadata", async () => {
      mockRequest.path = "/reference-data-upload-summary";
      mockRequest.auditMetadata = {
        shouldLog: true,
        action: "REFERENCE_DATA_UPLOAD"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.redirect as any)("/reference-data-upload-confirmation");

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "REFERENCE_DATA_UPLOAD"
        })
      );
    });

    it("should use custom entityInfo from auditMetadata", async () => {
      mockRequest.path = "/delete-court-confirm";
      mockRequest.auditMetadata = {
        shouldLog: true,
        action: "DELETE_COURT",
        entityInfo: "Name: Westminster Court, Location ID: 123"
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.redirect as any)("/delete-court-success");

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE_COURT",
          details: expect.stringContaining("Name: Westminster Court, Location ID: 123")
        })
      );
    });

    it("should extract validation errors from session with object errors", async () => {
      mockRequest.session = {
        validationErrors: [{ text: "Name is required" }, { text: "Email is invalid" }]
      };

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger redirect back to form with errors
      (mockResponse.redirect as any)("/add-jurisdiction");

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Status: Validation failed")
        })
      );
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Errors: Name is required; Email is invalid")
        })
      );
    });

    it("should handle render with errors and log validation failure", async () => {
      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger render with errors
      (mockResponse.render as any)("add-jurisdiction", {
        errors: [{ text: "Name is required" }, { text: "Welsh name is required" }]
      });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Status: Validation failed")
        })
      );
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Errors: Name is required; Welsh name is required")
        })
      );
    });

    it("should handle render with callback", async () => {
      const originalRender = mockResponse.render;

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const callback = vi.fn();
      (mockResponse.render as any)("test-view", {}, callback);

      // No audit log should be created for renders without errors
      expect(logAction).not.toHaveBeenCalled();
    });

    it("should handle render with options only", async () => {
      const originalRender = mockResponse.render;

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.render as any)("test-view", { data: "test" });

      // No audit log should be created for renders without errors
      expect(logAction).not.toHaveBeenCalled();
    });

    it("should handle render with view only", async () => {
      const originalRender = mockResponse.render;

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.render as any)("test-view");

      // No audit log should be created for renders without errors
      expect(logAction).not.toHaveBeenCalled();
    });

    it("should handle file upload in details", async () => {
      mockRequest.file = {
        originalname: "test.csv",
        size: 1024
      } as any;

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("File uploaded: test.csv (1024 bytes)")
        })
      );
    });

    it("should handle multiple files upload in details", async () => {
      mockRequest.files = [{ originalname: "file1.csv" } as any, { originalname: "file2.csv" } as any];

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      (mockResponse.json as any)({ success: true });

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.stringContaining("Files uploaded: file1.csv, file2.csv")
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should continue processing even if logging fails", async () => {
      logAction.mockRejectedValueOnce(new Error("Database error"));

      const middleware = auditLogMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
