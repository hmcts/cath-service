import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("third-party-users delete success page", () => {
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
        "third-party-users/[id]/delete/success/index",
        expect.objectContaining({
          panelTitle: "Third party user deleted",
          panelBody: "The third party user and associated subscriptions have been removed"
        })
      );
    });

    it("should render the success page in Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/delete/success/index",
        expect.objectContaining({ panelTitle: "Defnyddiwr trydydd parti wedi'i ddileu" })
      );
    });
  });
});
