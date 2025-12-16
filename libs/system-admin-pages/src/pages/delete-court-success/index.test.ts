import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { getHandler } from "./index.js";

describe("delete-court-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      session: {} as any
    };

    res = {
      render: vi.fn()
    };
  });

  it("should render success page and clear session", async () => {
    req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;

    await getHandler(req as Request, res as Response);

    expect((req.session as any).deleteCourt).toBeUndefined();
    expect(res.render).toHaveBeenCalledWith("delete-court-success/index", expect.any(Object));
  });

  it("should render success page in Welsh", async () => {
    req.query = { lng: "cy" };
    req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;

    await getHandler(req as Request, res as Response);

    expect((req.session as any).deleteCourt).toBeUndefined();
    expect(res.render).toHaveBeenCalledWith("delete-court-success/index", expect.any(Object));
  });

  it("should handle empty session gracefully", async () => {
    req.session = {} as any;

    await getHandler(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith("delete-court-success/index", expect.any(Object));
  });
});
