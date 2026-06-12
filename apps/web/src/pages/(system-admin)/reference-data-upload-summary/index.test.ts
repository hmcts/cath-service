import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    AuditLogAction: {
      REFERENCE_DATA_UPLOAD: "Reference data upload"
    },
    parseCsv: vi.fn(),
    validateLocationData: vi.fn(),
    enrichLocationData: vi.fn(),
    upsertLocations: vi.fn()
  };
});

import * as systemAdminPages from "@hmcts/system-admin-pages";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN"
  }
}));

describe("reference-data-upload-summary page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSession = {
      save: vi.fn((callback: any) => callback()),
      uploadData: undefined,
      uploadErrors: undefined
    };

    mockRequest = {
      query: {},
      session: mockSession
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to upload page when no upload data in session", async () => {
      mockRequest.session!.uploadData = undefined;

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should handle CSV parse errors", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      vi.mocked(systemAdminPages.parseCsv).mockReturnValue({
        success: false,
        errors: ["Invalid CSV format"],
        data: []
      });

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toEqual([{ text: "Invalid CSV format", href: "#file" }]);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should render preview without validation errors (validation happens on POST)", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      const mockData = [
        {
          locationId: 1,
          locationName: "Test",
          welshLocationName: "",
          email: "",
          contactNo: "",
          subJurisdictionNames: [],
          regionNames: [],
          locationReferences: []
        }
      ];

      vi.mocked(systemAdminPages.parseCsv).mockReturnValue({
        success: true,
        data: mockData,
        errors: []
      });

      vi.mocked(systemAdminPages.enrichLocationData).mockResolvedValue([
        {
          ...mockData[0],
          jurisdictionNames: [],
          jurisdictionWelshNames: [],
          subJurisdictionWelshNames: [],
          regionWelshNames: []
        }
      ]);

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "reference-data-upload-summary/index",
        expect.objectContaining({
          fileName: "test.csv",
          hasErrors: false
        })
      );
    });

    it("should render summary with valid data", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      const mockData = [
        {
          locationId: 1,
          locationName: "Test Court",
          welshLocationName: "Llys Prawf",
          email: "test@court.gov.uk",
          contactNo: "01234567890",
          subJurisdictionNames: ["Civil"],
          regionNames: ["London"],
          locationReferences: []
        }
      ];
      const enrichedData = [
        {
          locationId: 1,
          locationName: "Test Court",
          welshLocationName: "Llys Prawf",
          email: "test@court.gov.uk",
          contactNo: "01234567890",
          subJurisdictionNames: ["Civil"],
          regionNames: ["London"],
          jurisdictionNames: ["Family Court"],
          jurisdictionWelshNames: ["Llys Teulu"],
          subJurisdictionWelshNames: ["Sifil"],
          regionWelshNames: ["Llundain"],
          locationReferences: []
        }
      ];

      vi.mocked(systemAdminPages.parseCsv).mockReturnValue({
        success: true,
        data: mockData,
        errors: []
      });

      vi.mocked(systemAdminPages.validateLocationData).mockResolvedValue([]);
      vi.mocked(systemAdminPages.enrichLocationData).mockResolvedValue(enrichedData);

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = (mockResponse.render as any).mock.calls[0];
      expect(renderCall[0]).toBe("reference-data-upload-summary/index");
      expect(renderCall[1]).toMatchObject({
        fileName: "test.csv",
        hasErrors: false
      });
    });
  });

  describe("POST", () => {
    it("should redirect to upload when no upload data", async () => {
      mockRequest.session!.uploadData = undefined;

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should render validation errors when data is invalid", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      const mockData = [
        {
          locationId: 1,
          locationName: "Test",
          welshLocationName: "",
          email: "",
          contactNo: "",
          subJurisdictionNames: [],
          regionNames: [],
          locationReferences: []
        }
      ];

      vi.mocked(systemAdminPages.parseCsv).mockReturnValue({
        success: true,
        data: mockData,
        errors: []
      });

      vi.mocked(systemAdminPages.validateLocationData).mockResolvedValue([{ text: "Invalid location ID", href: "#file" }]);
      vi.mocked(systemAdminPages.enrichLocationData).mockResolvedValue([
        {
          ...mockData[0],
          jurisdictionNames: [],
          jurisdictionWelshNames: [],
          subJurisdictionWelshNames: [],
          regionWelshNames: []
        }
      ]);

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "reference-data-upload-summary/index",
        expect.objectContaining({
          fileName: "test.csv",
          errors: [{ text: "Invalid location ID", href: "#file" }],
          hasErrors: true
        })
      );
      expect(systemAdminPages.upsertLocations).not.toHaveBeenCalled();
    });

    it("should process and save valid data", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      const mockData = [
        {
          locationId: 1,
          locationName: "Test Court",
          welshLocationName: "Llys Prawf",
          email: "test@court.gov.uk",
          contactNo: "01234567890",
          subJurisdictionNames: ["Civil"],
          regionNames: ["London"],
          locationReferences: []
        }
      ];

      vi.mocked(systemAdminPages.parseCsv).mockReturnValue({
        success: true,
        data: mockData,
        errors: []
      });

      vi.mocked(systemAdminPages.validateLocationData).mockResolvedValue([]);
      vi.mocked(systemAdminPages.upsertLocations).mockResolvedValue();

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(systemAdminPages.upsertLocations).toHaveBeenCalledWith(mockData);
      expect(mockRequest.session!.uploadData).toBeUndefined();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload-confirmation");
    });
  });
});
