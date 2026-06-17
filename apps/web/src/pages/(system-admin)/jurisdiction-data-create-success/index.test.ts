import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("jurisdiction-data-create-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      session: {
        jurisdictionData: { id: 0, type: "Jurisdiction", name: "Civil", welshName: "Sifil" }
      } as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render success panel when session data exists", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create-success/index",
        expect.objectContaining({
          panelTitle: "Jurisdiction Data Created"
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

    it("should redirect to create page when no session data", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-create");
    });
  });
});
