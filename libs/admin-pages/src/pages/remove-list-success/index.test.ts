import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

describe("remove-list-success page", () => {
  describe("GET handler", () => {
    it("should redirect to search page if no success flag in session", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        session: {}
      } as unknown as Request;

      const mockRes = {
        redirect: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith("/remove-list-search");
    });

    it("should render success page and clear success flag", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: {},
        session: {
          removalSuccess: true,
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockReq.session.removalSuccess).toBeUndefined();
      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-success/index",
        expect.objectContaining({
          heading: expect.any(String),
          message: expect.any(String),
          nextSteps: expect.any(String),
          removeAnotherLink: expect.any(String),
          uploadFileLink: expect.any(String),
          homeLink: expect.any(String)
        })
      );
    });

    it("should render success page in Welsh when lng=cy", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1] as (req: Request, res: Response) => Promise<void>;

      const mockReq = {
        query: { lng: "cy" },
        session: {
          removalSuccess: true,
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const mockRes = {
        render: vi.fn()
      } as unknown as Response;

      await handler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith(
        "remove-list-success/index",
        expect.objectContaining({
          heading: expect.any(String),
          pageTitle: expect.stringContaining("Cynnwys")
        })
      );
    });
  });
});
