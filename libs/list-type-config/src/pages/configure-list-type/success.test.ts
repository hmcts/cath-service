import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    for (const handler of handlers) {
      await new Promise<void>((resolve, reject) => {
        const next = (err?: any) => (err ? reject(err) : resolve());
        const result = handler(req, res, next);
        if (result instanceof Promise) {
          result.then(() => resolve()).catch(reject);
        }
      });
    }
  } else {
    const result = handlers(req, res, () => {});
    if (result instanceof Promise) await result;
  }
}

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

const { GET } = await import("./success.js");

describe("success page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render page with English content", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type/success", expect.objectContaining({ t: expect.any(Object) }));
    });

    it("should render page with Welsh content when lng=cy", async () => {
      const req = { query: { lng: "cy" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith("configure-list-type/success", expect.objectContaining({ t: expect.any(Object) }));
    });

    it("should set Cache-Control header to prevent caching", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
    });

    it("should set Pragma header to no-cache", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
    });

    it("should set Expires header to 0", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Expires", "0");
    });

    it("should set all cache headers correctly", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        render: vi.fn(),
        setHeader: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.setHeader).toHaveBeenCalledTimes(3);
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
      expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
      expect(res.setHeader).toHaveBeenCalledWith("Expires", "0");
    });
  });
});
