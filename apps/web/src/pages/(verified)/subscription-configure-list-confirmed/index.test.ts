import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

describe("subscription-configure-list-confirmed", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      session: {
        emailSubscriptions: {
          listUpdateComplete: true
        }
      } as any,
      path: "/subscription-configure-list-confirmed"
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render the confirmed page when listUpdateComplete is set", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-confirmed/index", expect.objectContaining({ panelTitle: "List types updated" }));
    });

    it("should preserve listUpdateComplete in session to allow locale switching", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.listUpdateComplete).toBe(true);
    });

    it("should redirect to subscription-management when listUpdateComplete is not set", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });
  });
});
