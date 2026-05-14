import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("third-party-users subscriptions success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "user-1" } };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should render the success page in English", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/subscriptions/success/index",
        expect.objectContaining({ panelTitle: "Third Party Subscriptions Updated" })
      );
    });

    it("should render the success page in Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/subscriptions/success/index",
        expect.objectContaining({ panelTitle: "Diweddarwyd Tanysgrifiadau Trydydd Parti" })
      );
    });
  });
});
