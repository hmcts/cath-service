import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as csvParser from "../../reference-data-upload/parsers/csv-parser.js";
import * as repository from "../../reference-data-upload/repository/upload-repository.js";
import * as enrichment from "../../reference-data-upload/services/enrichment-service.js";
import * as validation from "../../reference-data-upload/validation/validation.js";

vi.mock("../../reference-data-upload/parsers/csv-parser.js", () => ({
  parseCsv: vi.fn()
}));

vi.mock("../../reference-data-upload/validation/validation.js", () => ({
  validateLocationData: vi.fn()
}));

vi.mock("../../reference-data-upload/services/enrichment-service.js", () => ({
  enrichLocationData: vi.fn()
}));

vi.mock("../../reference-data-upload/repository/upload-repository.js", () => ({
  upsertLocations: vi.fn()
}));

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

      vi.mocked(csvParser.parseCsv).mockReturnValue({
        success: false,
        errors: ["Invalid CSV format"]
      });

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toEqual([{ text: "Invalid CSV format", href: "#file" }]);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should render validation errors when data is invalid", async () => {
      mockRequest.session!.uploadData = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.csv",
        mimeType: "text/csv"
      };

      const mockData = [{ locationId: 1, locationName: "Test" }];

      vi.mocked(csvParser.parseCsv).mockReturnValue({
        success: true,
        data: mockData
      });

      vi.mocked(validation.validateLocationData).mockResolvedValue(["Invalid location ID"]);

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "reference-data-upload-summary/index",
        expect.objectContaining({
          fileName: "test.csv",
          errors: ["Invalid location ID"],
          hasErrors: true
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
          regionNames: ["London"]
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
          regionWelshNames: ["Llundain"]
        }
      ];

      vi.mocked(csvParser.parseCsv).mockReturnValue({
        success: true,
        data: mockData
      });

      vi.mocked(validation.validateLocationData).mockResolvedValue([]);
      vi.mocked(enrichment.enrichLocationData).mockResolvedValue(enrichedData);

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
          regionNames: ["London"]
        }
      ];

      vi.mocked(csvParser.parseCsv).mockReturnValue({
        success: true,
        data: mockData
      });

      vi.mocked(validation.validateLocationData).mockResolvedValue([]);
      vi.mocked(repository.upsertLocations).mockResolvedValue();

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(repository.upsertLocations).toHaveBeenCalledWith(mockData);
      expect(mockRequest.session!.uploadData).toBeUndefined();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload-confirmation");
    });
  });
});
