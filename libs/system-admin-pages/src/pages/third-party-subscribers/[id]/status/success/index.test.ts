import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, getHandler } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn((roles: string[]) => ({ requiredRoles: roles })),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

const USER_ID = "00000000-0000-0000-0000-000000000001";
const TEMPLATE = "third-party-subscribers/[id]/status/success/index";

describe("third-party-subscribers status success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: USER_ID } };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  it("should require the system admin role", () => {
    expect(GET).toEqual([{ requiredRoles: ["SYSTEM_ADMIN"] }, getHandler]);
  });

  describe("getHandler", () => {
    it("should render the success page in English", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: "Third Party Account Status Updated",
          panelTitle: "Third Party Account Status Updated",
          panelBody: "Third party account status has been successfully updated.",
          lngParam: "",
          userId: USER_ID
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
          panelTitle: "Statws Cyfrif Trydydd Parti wedi'i Ddiweddaru",
          lngParam: "?lng=cy"
        })
      );
    });
  });
});
