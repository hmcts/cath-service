import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("third-party-users create confirmation page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should render confirmation page and clear session", async () => {
      // Arrange
      req.session = { thirdPartyCreate: { name: "Confirmed User", createdId: "abc", createdName: "Confirmed User" } } as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/create/confirmation/index",
        expect.objectContaining({
          panelTitle: "Third party user created",
          createdName: "Confirmed User"
        })
      );
      expect((req.session as never as Record<string, unknown>).thirdPartyCreate).toBeUndefined();
    });

    it("should render Welsh confirmation page", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.session = { thirdPartyCreate: { name: "User", createdId: "abc", createdName: "User" } } as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/create/confirmation/index",
        expect.objectContaining({ panelTitle: "Crëwyd defnyddiwr trydydd parti" })
      );
    });
  });
});
