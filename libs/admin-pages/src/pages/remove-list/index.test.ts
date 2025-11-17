import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

describe("remove-list page", () => {
  describe("GET handler", () => {
    it("should redirect to search page", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {}
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search");
    });

    it("should preserve language parameter when redirecting", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: { lng: "cy" }
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search?lng=cy");
    });
  });
});
