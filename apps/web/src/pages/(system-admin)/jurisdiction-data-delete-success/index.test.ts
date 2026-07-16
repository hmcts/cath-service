import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("jurisdiction-data-delete-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      session: {
        jurisdictionData: { id: 1, type: "Jurisdiction", name: "Civil", welshName: "Sifil" }
      } as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render success panel when session data exists", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-delete-success/index",
        expect.objectContaining({
          t: expect.objectContaining({ panelTitle: "Jurisdiction Data Deleted" })
        })
      );
    });

    it("should clear session data after rendering", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toBeUndefined();
    });

    it("should redirect to list when no session data", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });
  });
});
