import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as _GET } from "./index.js";

const getHandler = _GET[_GET.length - 1];

describe("delete-court-subscriptions-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      session: {} as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  it("should render success page with the English court name and keep the session", async () => {
    req.session = { deleteCourt: { locationId: 123, name: "Test Court", welshName: "Llys Prawf" } } as any;

    await getHandler(req as Request, res as Response);

    expect((req.session as any).deleteCourt).toEqual({ locationId: 123, name: "Test Court", welshName: "Llys Prawf" });
    expect(res.render).toHaveBeenCalledWith("delete-court-subscriptions-success/index", expect.objectContaining({ locationName: "Test Court" }));
  });

  it("should render success page with the Welsh court name when locale is cy", async () => {
    req.query = { lng: "cy" };
    req.session = { deleteCourt: { locationId: 123, name: "Test Court", welshName: "Llys Prawf" } } as any;

    await getHandler(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith("delete-court-subscriptions-success/index", expect.objectContaining({ locationName: "Llys Prawf" }));
  });

  it("should redirect to delete-court when there is no session data", async () => {
    req.session = {} as any;

    await getHandler(req as Request, res as Response);

    expect(res.redirect).toHaveBeenCalledWith("/delete-court");
    expect(res.render).not.toHaveBeenCalled();
  });

  it("should redirect to delete-court in Welsh when there is no session data", async () => {
    req.query = { lng: "cy" };
    req.session = {} as any;

    await getHandler(req as Request, res as Response);

    expect(res.redirect).toHaveBeenCalledWith("/delete-court?lng=cy");
  });
});
