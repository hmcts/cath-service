import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    findJurisdictionDataById: vi.fn()
  };
});

import { findJurisdictionDataById } from "@hmcts/system-admin-pages";

describe("jurisdiction-data-modify page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: { id: "1", type: "Jurisdiction" },
      session: {} as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render summary when record found", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({
        jurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil",
        deletedAt: null
      });

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-modify/index",
        expect.objectContaining({
          record: { name: "Civil", type: "Jurisdiction" },
          updateHref: "/jurisdiction-data-update",
          deleteHref: "/jurisdiction-data-delete"
        })
      );
    });

    it("should store record in session", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({
        jurisdictionId: 1,
        name: "Civil",
        welshName: "Sifil",
        deletedAt: null
      });

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toEqual({
        id: 1,
        type: "Jurisdiction",
        name: "Civil",
        welshName: "Sifil",
        jurisdictionId: undefined
      });
    });

    it("should store jurisdictionId in session for Sub-Jurisdiction type", async () => {
      // Arrange
      req.query = { id: "10", type: "Sub-Jurisdiction" };
      vi.mocked(findJurisdictionDataById).mockResolvedValue({
        subJurisdictionId: 10,
        name: "County Court",
        welshName: "Llys Sirol",
        jurisdictionId: 2,
        deletedAt: null
      });

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toEqual({
        id: 10,
        type: "Sub-Jurisdiction",
        name: "County Court",
        welshName: "Llys Sirol",
        jurisdictionId: 2
      });
    });

    it("should redirect to list when id is missing", async () => {
      // Arrange
      req.query = { type: "Jurisdiction" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });

    it("should redirect to list when type is invalid", async () => {
      // Arrange
      req.query = { id: "1", type: "Invalid" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });

    it("should redirect to list when record not found", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue(null);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });
  });
});
