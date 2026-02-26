import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler } from "./index.js";

describe("list-search-config-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
    };

    res = {
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render success page in English", async () => {
      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "list-search-config-success/index",
        expect.objectContaining({
          pageTitle: "List type search configuration updated",
          heading: "List type search configuration updated",
          body: "What do you want to do next?",
          returnLink: "Manage list types"
        })
      );
    });

    it("should render success page in Welsh", async () => {
      req.query = { lng: "cy" };

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "list-search-config-success/index",
        expect.objectContaining({
          pageTitle: "Ffurfweddiad chwilio math rhestr wedi'i ddiweddaru",
          heading: "Ffurfweddiad chwilio math rhestr wedi'i ddiweddaru",
          body: "Beth hoffech chi ei wneud nesaf?",
          returnLink: "Rheoli mathau rhestr"
        })
      );
    });
  });
});
