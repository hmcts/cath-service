import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return { ...actual, listJurisdictionData: vi.fn() };
});

import { listJurisdictionData } from "@hmcts/system-admin-pages";

describe("region-data-list page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, session: {} as any };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET", () => {
    it("should render only regions from all jurisdiction data", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([
        { id: 1, name: "Family", type: "Jurisdiction", welshName: "Teulu" },
        { id: 2, name: "North", type: "Region", welshName: "Gogledd" },
        { id: 3, name: "Civil", type: "Sub-Jurisdiction", welshName: "Sifil" },
        { id: 4, name: "South", type: "Region", welshName: "De" }
      ] as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-list/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([expect.arrayContaining([{ text: "North" }]), expect.arrayContaining([{ text: "South" }])])
        })
      );
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows).toHaveLength(2);
    });

    it("should render empty state when no regions exist", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([{ id: 1, name: "Family", type: "Jurisdiction", welshName: "Teulu" }] as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows).toHaveLength(0);
    });

    it("should include modify link pointing to region-data-modify", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([{ id: 5, name: "West", type: "Region", welshName: "Gorllewin" }] as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows[0][1].html).toContain("/region-data-modify?id=5&type=Region");
    });

    it("should render Welsh content when locale is cy", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([]);
      res.locals = { locale: "cy" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.t.title).toBe("Addasu rhanbarth presennol");
    });
  });
});
