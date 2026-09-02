import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    deleteJurisdictionData: vi.fn(),
    findJurisdictionDataById: vi.fn()
  };
});

import { deleteJurisdictionData, findJurisdictionDataById } from "@hmcts/system-admin-pages";

describe("jurisdiction-data-delete page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {
        jurisdictionData: { id: 1, type: "Jurisdiction", name: "Civil", welshName: "Sifil" }
      } as any,
      user: { email: "admin@example.com" } as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render confirmation page with record details", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-delete/index",
        expect.objectContaining({
          record: { name: "Civil", type: "Jurisdiction", parentJurisdictionName: undefined }
        })
      );
    });

    it("should render with parent jurisdiction name for Sub-Jurisdiction", async () => {
      // Arrange
      req.session = {
        jurisdictionData: { id: 10, type: "Sub-Jurisdiction", name: "County Court", welshName: "Llys Sirol", jurisdictionId: 2 }
      } as any;
      vi.mocked(findJurisdictionDataById).mockResolvedValue({
        jurisdictionId: 2,
        name: "Civil",
        welshName: "Sifil",
        deletedAt: null
      });

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-delete/index",
        expect.objectContaining({
          record: { name: "County Court", type: "Sub-Jurisdiction", parentJurisdictionName: "Civil" }
        })
      );
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

  describe("POST", () => {
    it("should call delete and redirect to success when yes selected", async () => {
      // Arrange
      req.body = { confirmation: "yes" };
      vi.mocked(deleteJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(deleteJurisdictionData).toHaveBeenCalledWith(1, "Jurisdiction", expect.objectContaining({ userEmail: "admin@example.com" }));
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-delete-success");
    });

    it("should redirect to modify page when no selected", async () => {
      // Arrange
      req.body = { confirmation: "no" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-modify?id=1&type=Jurisdiction");
    });

    it("should re-render with error when no selection made", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-delete/index",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#confirmation" }],
          radioError: { text: "Please select one option" }
        })
      );
    });

    it("should re-render with error when dependency check fails", async () => {
      // Arrange
      req.body = { confirmation: "yes" };
      vi.mocked(deleteJurisdictionData).mockResolvedValue([
        { text: "This record cannot be deleted because it is linked to one or more sub-jurisdictions", href: "#" }
      ]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-delete/index",
        expect.objectContaining({
          errors: [{ text: "This record cannot be deleted because it is linked to one or more sub-jurisdictions", href: "#" }]
        })
      );
    });
  });
});
