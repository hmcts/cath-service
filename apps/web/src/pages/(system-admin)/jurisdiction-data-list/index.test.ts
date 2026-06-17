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
    listJurisdictionData: vi.fn()
  };
});

import { listJurisdictionData } from "@hmcts/system-admin-pages";

describe("jurisdiction-data-list page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} };
    res = {
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render list with no filter when no query params", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([
        { id: 1, name: "Civil", welshName: "Sifil", type: "Jurisdiction" },
        { id: 10, name: "County Court", welshName: "Llys Sirol", type: "Sub-Jurisdiction" }
      ]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(listJurisdictionData).toHaveBeenCalledWith(undefined);
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-list/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([expect.arrayContaining([{ text: "Civil" }, { text: "Jurisdiction" }])])
        })
      );
    });

    it("should pass jurisdiction filter from query params", async () => {
      // Arrange
      req.query = { jurisdiction: "Civil" };
      vi.mocked(listJurisdictionData).mockResolvedValue([{ id: 1, name: "Civil", welshName: "Sifil", type: "Jurisdiction" }]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(listJurisdictionData).toHaveBeenCalledWith({ jurisdiction: "Civil" });
    });

    it("should pass subJurisdiction filter from query params", async () => {
      // Arrange
      req.query = { subJurisdiction: "County Court" };
      vi.mocked(listJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(listJurisdictionData).toHaveBeenCalledWith({ subJurisdiction: "County Court" });
    });

    it("should render modify links with correct query params", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([{ id: 5, name: "Family", welshName: "Teulu", type: "Jurisdiction" }]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderCall.tableRows[0][2].html).toContain("/jurisdiction-data-modify?id=5&type=Jurisdiction");
      expect(renderCall.tableRows[0][2].html).toContain("Modify");
    });

    it("should preserve filter values in render for form repopulation", async () => {
      // Arrange
      req.query = { jurisdiction: "Civil", subJurisdiction: "Crown" };
      vi.mocked(listJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-list/index",
        expect.objectContaining({
          filterValues: { jurisdiction: "Civil", subJurisdiction: "Crown" }
        })
      );
    });

    it("should render empty state when no results", async () => {
      // Arrange
      vi.mocked(listJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-list/index",
        expect.objectContaining({
          tableRows: []
        })
      );
    });
  });
});
