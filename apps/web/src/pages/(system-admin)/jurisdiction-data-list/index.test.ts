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

const ALL_DATA = [
  { id: 1, name: "Civil", welshName: "Sifil", type: "Jurisdiction" },
  { id: 10, name: "County Court", welshName: "Llys Sirol", type: "Sub-Jurisdiction" },
  { id: 20, name: "North West", welshName: "Gogledd Orllewin", type: "Region" }
];

describe("jurisdiction-data-list page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listJurisdictionData).mockResolvedValue(ALL_DATA);
    req = { query: {} };
    res = {
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render all records when no type filter is selected", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(listJurisdictionData).toHaveBeenCalledWith();
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      // Region is always excluded from this page
      expect(renderArgs.tableRows).toHaveLength(2);
    });

    it("should filter to Jurisdiction type when type=Jurisdiction", async () => {
      // Arrange
      req.query = { type: "Jurisdiction" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows).toHaveLength(1);
      expect(renderArgs.tableRows[0][0].text).toBe("Civil");
    });

    it("should filter to multiple types when type is an array", async () => {
      // Arrange
      req.query = { type: ["Jurisdiction", "Sub-Jurisdiction"] };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows).toHaveLength(2);
    });

    it("should build typeItems with correct checked state", async () => {
      // Arrange
      req.query = { type: "Jurisdiction" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.typeItems).toEqual([
        { value: "Jurisdiction", text: "Jurisdiction", checked: true },
        { value: "Sub-Jurisdiction", text: "Sub-Jurisdiction", checked: false }
      ]);
    });

    it("should build remove URLs that exclude the removed type", async () => {
      // Arrange
      req.query = { type: ["Jurisdiction", "Sub-Jurisdiction"] };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.typeRemoveUrls[0]).toBe("/jurisdiction-data-list?type=Sub-Jurisdiction");
      expect(renderArgs.typeRemoveUrls[1]).toBe("/jurisdiction-data-list?type=Jurisdiction");
    });

    it("should build clear-all remove URL when only one type selected", async () => {
      // Arrange
      req.query = { type: "Jurisdiction" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.typeRemoveUrls[0]).toBe("/jurisdiction-data-list");
    });

    it("should render modify links with correct query params", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows[0][2].html).toContain("/jurisdiction-data-modify?id=1&type=Jurisdiction");
      expect(renderArgs.tableRows[0][2].html).toContain("Modify");
    });

    it("should use localised type labels in table rows", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows[0][1].text).toBe("Awdurdodaeth");
    });

    it("should render empty state when no results match filter", async () => {
      // Arrange
      req.query = { type: "Sub-Jurisdiction" };
      vi.mocked(listJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.tableRows).toHaveLength(0);
    });
  });
});
