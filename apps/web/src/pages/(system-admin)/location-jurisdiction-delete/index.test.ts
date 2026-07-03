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
    deleteLocationJurisdictionData: vi.fn()
  };
});

import { deleteLocationJurisdictionData } from "@hmcts/system-admin-pages";

describe("location-jurisdiction-delete page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {
        locationJurisdiction: { locationId: 100, locationName: "Test Court", locationWelshName: "Llys Prawf" }
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
    it("should render delete confirmation page", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "location-jurisdiction-delete/index",
        expect.objectContaining({ t: expect.objectContaining({ title: "Are you sure you want to delete this data?" }) })
      );
    });

    it("should redirect to search when no session data", async () => {
      req.session = {} as any;

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });
  });

  describe("POST", () => {
    it("should delete and redirect to success when yes selected", async () => {
      req.body = { confirmation: "yes" };
      vi.mocked(deleteLocationJurisdictionData).mockResolvedValue();

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(deleteLocationJurisdictionData).toHaveBeenCalledWith(100, expect.objectContaining({ userEmail: "admin@example.com" }));
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-delete-success");
    });

    it("should redirect to manage page when no selected", async () => {
      req.body = { confirmation: "no" };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-manage");
    });

    it("should re-render with error when no selection made", async () => {
      req.body = {};

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "location-jurisdiction-delete/index",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#confirmation" }]
        })
      );
    });
  });
});
