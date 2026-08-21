import { AuditLogAction, buildMiReport } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/system-admin-pages")>("@hmcts/system-admin-pages");
  return {
    ...actual,
    buildMiReport: vi.fn()
  };
});

describe("mi-report page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {} };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
      locals: { locale: "en" }
    };
  });

  it("should guard GET and POST with a role middleware before the handler", () => {
    // Assert
    expect(GET).toHaveLength(2);
    expect(POST).toHaveLength(2);
    expect(typeof GET[0]).toBe("function");
    expect(typeof POST[0]).toBe("function");
  });

  describe("GET", () => {
    it("should render the selection page with both select dropdowns in English", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "mi-report/index",
        expect.objectContaining({
          periodItems: expect.arrayContaining([expect.objectContaining({ value: "all" })]),
          reportTypeItems: expect.arrayContaining([expect.objectContaining({ value: "all-data" })])
        })
      );
    });
  });

  describe("POST", () => {
    it("should re-render with field-ordered errors when nothing is selected", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(buildMiReport).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "mi-report/index",
        expect.objectContaining({
          errors: [
            { text: "Select a reporting period", href: "#period" },
            { text: "Select a report type", href: "#reportType" }
          ]
        })
      );
    });

    it("should stream the xlsx with the correct headers on a valid selection", async () => {
      // Arrange
      req.body = { period: "7", reportType: "all-data" };
      vi.mocked(buildMiReport).mockResolvedValue({ buffer: Buffer.from("xlsx"), filename: "mi-report-all-data-7days-2026-08-19.xlsx" });

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(buildMiReport).toHaveBeenCalledWith("all-data", "7");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="mi-report-all-data-7days-2026-08-19.xlsx"');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it("should set the DOWNLOAD_MI_REPORT audit metadata before sending", async () => {
      // Arrange
      req.body = { period: "all", reportType: "publications" };
      vi.mocked(buildMiReport).mockResolvedValue({ buffer: Buffer.from("xlsx"), filename: "mi-report-publications-from-beginning-2026-08-19.xlsx" });

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(req.auditMetadata?.action).toBe(AuditLogAction.DOWNLOAD_MI_REPORT);
      expect(req.auditMetadata?.entityInfo).toContain("publications");
    });
  });
});
