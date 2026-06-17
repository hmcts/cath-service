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
    createJurisdictionData: vi.fn(),
    getAllJurisdictions: vi.fn()
  };
});

import { createJurisdictionData, getAllJurisdictions } from "@hmcts/system-admin-pages";

describe("jurisdiction-data-create page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllJurisdictions).mockResolvedValue([
      { jurisdictionId: 1, displayName: "Family" },
      { jurisdictionId: 2, displayName: "Civil" }
    ]);
    req = {
      query: {},
      body: {},
      session: {} as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render empty form with jurisdiction items", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(getAllJurisdictions).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create/index",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Create Jurisdiction Data" }),
          data: { name: "", welshName: "", type: "", jurisdictionId: "" },
          jurisdictionItems: [
            { value: "", text: "Select a jurisdiction" },
            { value: "1", text: "Family" },
            { value: "2", text: "Civil" }
          ],
          typeItems: [
            { value: "", text: "Select a type" },
            { value: "Jurisdiction", text: "Jurisdiction" },
            { value: "Sub-Jurisdiction", text: "Sub-Jurisdiction" }
          ],
          errors: undefined
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to success when validation passes", async () => {
      // Arrange
      req.body = { name: "Family", welshName: "Teulu", type: "Jurisdiction" };
      vi.mocked(createJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-create-success");
    });

    it("should store created record in session on success", async () => {
      // Arrange
      req.body = { name: "Family", welshName: "Teulu", type: "Jurisdiction" };
      vi.mocked(createJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toEqual({
        id: 0,
        type: "Jurisdiction",
        name: "Family",
        welshName: "Teulu"
      });
    });

    it("should re-render with errors when name is empty", async () => {
      // Arrange
      req.body = { name: "", welshName: "Teulu", type: "Jurisdiction" };
      vi.mocked(createJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create/index",
        expect.objectContaining({
          errors: [{ text: "Enter the name in English", href: "#name" }],
          data: { name: "", welshName: "Teulu", type: "Jurisdiction", jurisdictionId: "" }
        })
      );
    });

    it("should re-render with errors when welsh name is empty", async () => {
      // Arrange
      req.body = { name: "Family", welshName: "", type: "Jurisdiction" };
      vi.mocked(createJurisdictionData).mockResolvedValue([{ text: "Enter the name in Welsh", href: "#welshName" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create/index",
        expect.objectContaining({
          errors: [{ text: "Enter the name in Welsh", href: "#welshName" }]
        })
      );
    });

    it("should re-render with errors when type is not selected", async () => {
      // Arrange
      req.body = { name: "Family", welshName: "Teulu", type: "" };
      vi.mocked(createJurisdictionData).mockResolvedValue([{ text: "Select a type", href: "#type" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create/index",
        expect.objectContaining({
          errors: [{ text: "Select a type", href: "#type" }]
        })
      );
    });

    it("should pass jurisdictionId when type is Sub-Jurisdiction", async () => {
      // Arrange
      req.body = { name: "TestSub", welshName: "TestCy", type: "Sub-Jurisdiction", jurisdictionId: "1" };
      vi.mocked(createJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(createJurisdictionData).toHaveBeenCalledWith({
        name: "TestSub",
        welshName: "TestCy",
        type: "Sub-Jurisdiction",
        jurisdictionId: 1
      });
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-create-success");
    });

    it("should re-render with errors when Sub-Jurisdiction has no jurisdictionId", async () => {
      // Arrange
      req.body = { name: "TestSub", welshName: "TestCy", type: "Sub-Jurisdiction", jurisdictionId: "" };
      vi.mocked(createJurisdictionData).mockResolvedValue([{ text: "Select a jurisdiction", href: "#jurisdictionId" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-create/index",
        expect.objectContaining({
          errors: [{ text: "Select a jurisdiction", href: "#jurisdictionId" }],
          jurisdictionItems: expect.arrayContaining([{ value: "", text: "Select a jurisdiction" }])
        })
      );
    });
  });
});
