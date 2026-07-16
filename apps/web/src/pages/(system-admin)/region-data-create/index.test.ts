import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return { ...actual, createJurisdictionData: vi.fn() };
});

import { createJurisdictionData } from "@hmcts/system-admin-pages";

describe("region-data-create page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as any };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET", () => {
    it("should render empty form", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-create/index",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Create Region Data" }),
          data: { name: "", welshName: "" },
          errors: undefined
        })
      );
    });

    it("should render Welsh content when locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.t.title).toBe("Creu Data Rhanbarth");
    });
  });

  describe("POST", () => {
    it("should redirect to success when validation passes", async () => {
      // Arrange
      req.body = { name: "North", welshName: "Gogledd" };
      vi.mocked(createJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(createJurisdictionData).toHaveBeenCalledWith({ name: "North", welshName: "Gogledd", type: "Region" });
      expect(res.redirect).toHaveBeenCalledWith("/region-data-create-success");
    });

    it("should store region in session on success", async () => {
      // Arrange
      req.body = { name: "North", welshName: "Gogledd" };
      vi.mocked(createJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toEqual({ id: 0, type: "Region", name: "North", welshName: "Gogledd" });
    });

    it("should re-render with errors when name is empty", async () => {
      // Arrange
      req.body = { name: "", welshName: "Gogledd" };
      vi.mocked(createJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-create/index",
        expect.objectContaining({
          errors: [{ text: "Enter the name in English", href: "#name" }],
          data: { name: "", welshName: "Gogledd" }
        })
      );
    });
  });
});
