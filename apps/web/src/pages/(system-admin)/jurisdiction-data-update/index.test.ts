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
    updateJurisdictionData: vi.fn(),
    getAllJurisdictions: vi.fn()
  };
});

import { getAllJurisdictions, updateJurisdictionData } from "@hmcts/system-admin-pages";

const MOCK_JURISDICTIONS = [
  { jurisdictionId: 1, displayName: "Civil" },
  { jurisdictionId: 2, displayName: "Crime" }
];

describe("jurisdiction-data-update page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllJurisdictions).mockResolvedValue(MOCK_JURISDICTIONS);
    req = {
      query: {},
      body: {},
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
    it("should render form for Jurisdiction without jurisdiction items", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(getAllJurisdictions).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-update/index",
        expect.objectContaining({
          type: "Jurisdiction",
          data: { name: "Civil", welshName: "Sifil", type: "Jurisdiction", jurisdictionId: "" },
          jurisdictionItems: undefined,
          errors: undefined
        })
      );
    });

    it("should load jurisdiction items for Sub-Jurisdiction type", async () => {
      // Arrange
      req.session = {
        jurisdictionData: { id: 10, type: "Sub-Jurisdiction", name: "County Court", welshName: "Llys Sirol", jurisdictionId: 1 }
      } as any;

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(getAllJurisdictions).toHaveBeenCalled();
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.jurisdictionItems).toHaveLength(3); // placeholder + 2 jurisdictions
      expect(renderArgs.jurisdictionItems[1]).toEqual(expect.objectContaining({ value: "1", selected: true }));
      expect(renderArgs.data.jurisdictionId).toBe("1");
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
    it("should redirect to success for Jurisdiction type when validation passes", async () => {
      // Arrange
      req.body = { name: "Updated", welshName: "Diweddarwyd" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(updateJurisdictionData).toHaveBeenCalledWith(1, "Jurisdiction", { name: "Updated", welshName: "Diweddarwyd", jurisdictionId: undefined });
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-update-success");
    });

    it("should pass jurisdictionId to service for Sub-Jurisdiction type", async () => {
      // Arrange
      req.session = {
        jurisdictionData: { id: 10, type: "Sub-Jurisdiction", name: "County Court", welshName: "Llys Sirol", jurisdictionId: 1 }
      } as any;
      req.body = { name: "Updated Court", welshName: "Llys Diweddarwyd", jurisdictionId: "2" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(updateJurisdictionData).toHaveBeenCalledWith(10, "Sub-Jurisdiction", { name: "Updated Court", welshName: "Llys Diweddarwyd", jurisdictionId: 2 });
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-update-success");
    });

    it("should re-render with jurisdiction items on validation failure for Sub-Jurisdiction", async () => {
      // Arrange
      req.session = {
        jurisdictionData: { id: 10, type: "Sub-Jurisdiction", name: "County Court", welshName: "Llys Sirol", jurisdictionId: 1 }
      } as any;
      req.body = { name: "", welshName: "Llys", jurisdictionId: "1" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.errors).toEqual([{ text: "Enter the name in English", href: "#name" }]);
      expect(renderArgs.jurisdictionItems).toBeDefined();
    });

    it("should re-render without jurisdiction items on validation failure for Jurisdiction", async () => {
      // Arrange
      req.body = { name: "", welshName: "Sifil" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-update/index",
        expect.objectContaining({
          type: "Jurisdiction",
          errors: [{ text: "Enter the name in English", href: "#name" }],
          data: expect.objectContaining({ name: "", welshName: "Sifil", type: "Jurisdiction" }),
          jurisdictionItems: undefined
        })
      );
    });

    it("should redirect to list when no session data on POST", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });
  });
});
