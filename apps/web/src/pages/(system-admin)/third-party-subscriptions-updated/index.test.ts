import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("third-party-subscriptions-updated page", () => {
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
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith("third-party-subscriptions-updated/index", expect.any(Object));
    });

    it("should render success page in Welsh", async () => {
      req.query = { lng: "cy" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith("third-party-subscriptions-updated/index", expect.any(Object));
    });
  });
});
