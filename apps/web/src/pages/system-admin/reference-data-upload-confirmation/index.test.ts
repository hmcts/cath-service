import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN"
  }
}));

describe("reference-data-upload-confirmation page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      session: {} as any
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render confirmation page with English content", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = (mockResponse.render as any).mock.calls[0];
      expect(renderCall[0]).toBe("reference-data-upload-confirmation/index");
      expect(renderCall[1]).toHaveProperty("locale", "en");
    });

    it("should render with all expected properties", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = (mockResponse.render as any).mock.calls[0];
      expect(renderCall[0]).toBe("reference-data-upload-confirmation/index");
      expect(renderCall[1]).toHaveProperty("successBannerTitle");
      expect(renderCall[1]).toHaveProperty("nextStepsTitle");
      expect(renderCall[1]).toHaveProperty("uploadAnotherFileText");
      expect(renderCall[1]).toHaveProperty("homeText");
    });
  });
});
