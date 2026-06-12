import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/system-admin-pages", () => ({
  generateReferenceDataCsv: vi.fn()
}));

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN"
  }
}));

describe("reference-data-download page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};

    mockResponse = {
      setHeader: vi.fn(),
      send: vi.fn()
    };
  });

  describe("GET", () => {
    it("should generate and download CSV file", async () => {
      const { generateReferenceDataCsv } = await import("@hmcts/system-admin-pages");
      const csvContent = "LOCATION_ID,LOCATION_NAME\n1,Test Court";
      vi.mocked(generateReferenceDataCsv).mockResolvedValue(csvContent);

      const { GET } = await import("./index.js");
      const handler = GET[GET.length - 1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(generateReferenceDataCsv).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringMatching(/^attachment; filename="reference-data-\d{4}-\d{2}-\d{2}\.csv"$/)
      );
      expect(mockResponse.send).toHaveBeenCalledWith(csvContent);
    });
  });
});
