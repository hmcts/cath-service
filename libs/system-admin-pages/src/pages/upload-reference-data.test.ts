import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth module
vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: {
    SYSTEM_ADMIN: "system-admin"
  }
}));

// Import after mocking
const { GET } = await import("./upload-reference-data.js");

describe("upload-reference-data page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      session: {} as any
    };

    mockResponse = {
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to /reference-data-upload", async () => {
      // GET is an array of middleware, the last one is the actual handler
      const handler = GET[GET.length - 1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });
  });
});
