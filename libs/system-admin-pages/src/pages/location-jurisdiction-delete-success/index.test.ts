import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("location-jurisdiction-delete-success page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      session: {
        locationJurisdiction: { locationId: 100, locationName: "Test Court", locationWelshName: "Llys Prawf" }
      } as any
    };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  it("should render success panel when session data exists", async () => {
    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith("location-jurisdiction-delete-success/index", expect.objectContaining({ panelTitle: "Jurisdiction Data Deleted" }));
  });

  it("should clear session data after rendering", async () => {
    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect((req.session as any).locationJurisdiction).toBeUndefined();
  });

  it("should redirect to search when no session data", async () => {
    req.session = {} as any;

    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
  });
});
