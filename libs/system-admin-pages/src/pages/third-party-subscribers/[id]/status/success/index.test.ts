import { USER_ROLES } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, getHandler } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: (roles: string[]) => Object.assign(vi.fn(), { roles }),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

const TEMPLATE = "third-party-subscribers/[id]/status/success/index";

describe("third-party-subscribers status success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "00000000-0000-0000-0000-000000000001" } };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  it("should restrict GET to system admins as the first middleware", () => {
    // Assert
    expect(GET).toHaveLength(2);
    expect((GET[0] as RoleGuard).roles).toEqual([USER_ROLES.SYSTEM_ADMIN]);
    expect(GET[1]).toBe(getHandler);
  });

  describe("getHandler", () => {
    it("should render the success page in English", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Third party account status updated",
          panelTitle: "Third party account status updated",
          panelBody: "Third party account status has been successfully updated.",
          nextMessage: "To further update third party account, you can go to:",
          manageLink: "Manage third party subscribers",
          lngParam: ""
        })
      );
    });

    it("should render the success page in Welsh", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          panelTitle: "Statws cyfrif trydydd parti wedi'i ddiweddaru",
          manageLink: "Rheoli tanysgrifwyr trydydd parti",
          lngParam: "?lng=cy"
        })
      );
    });
  });
});

type RoleGuard = { roles: string[] };
