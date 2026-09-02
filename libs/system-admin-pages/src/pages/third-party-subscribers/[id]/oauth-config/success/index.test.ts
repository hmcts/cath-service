import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("third-party-subscribers oauth-config success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, params: { id: "00000000-0000-0000-0000-000000000001" } };
    res = { render: vi.fn(), locals: { locale: "en" } };
  });

  describe("getHandler", () => {
    it("should render success page with English content", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/success/index",
        expect.objectContaining({
          pageTitle: "OAuth credentials saved",
          panelTitle: "OAuth credentials saved",
          lngParam: ""
        })
      );
    });

    it("should render success page with Welsh content", async () => {
      // Arrange
      (res as any).locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/success/index",
        expect.objectContaining({
          pageTitle: "Cymwysterau OAuth wedi'u cadw",
          lngParam: "?lng=cy"
        })
      );
    });
  });
});
