import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("../../third-party-user/validation.js", () => ({
  validateThirdPartyUserName: vi.fn()
}));

import { validateThirdPartyUserName } from "../../third-party-user/validation.js";

describe("create-third-party-user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      session: {} as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render page in English", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: undefined,
          name: ""
        })
      );
    });

    it("should render page in Welsh", async () => {
      req.query = { lng: "cy" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: undefined
        })
      );
    });

    it("should pre-fill name from session", async () => {
      (req.session as any).createThirdPartyUser = { name: "Test User" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          name: "Test User"
        })
      );
    });
  });

  describe("POST", () => {
    it("should show validation error when name is empty", async () => {
      req.body = { name: "" };
      (validateThirdPartyUserName as any).mockReturnValue({ href: "#name" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#name" })])
        })
      );
    });

    it("should show validation error when name is undefined", async () => {
      req.body = { name: undefined };
      (validateThirdPartyUserName as any).mockReturnValue({ href: "#name" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#name" })])
        })
      );
    });

    it("should show name too long error when validation fails for long name", async () => {
      req.body = { name: "A".repeat(300) };
      (validateThirdPartyUserName as any).mockReturnValue({ href: "#name" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#name" })]),
          name: "A".repeat(300)
        })
      );
    });

    it("should redirect to summary page on valid input", async () => {
      req.body = { name: "Test User" };
      (validateThirdPartyUserName as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.session).toHaveProperty("createThirdPartyUser");
      expect((req.session as any).createThirdPartyUser.name).toBe("Test User");
      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user-summary");
    });

    it("should redirect to summary page with Welsh locale", async () => {
      req.query = { lng: "cy" };
      req.body = { name: "Test User" };
      (validateThirdPartyUserName as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user-summary?lng=cy");
    });

    it("should trim whitespace from name", async () => {
      req.body = { name: "  Test User  " };
      (validateThirdPartyUserName as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).createThirdPartyUser.name).toBe("Test User");
    });

    it("should generate idempotency token", async () => {
      req.body = { name: "Test User" };
      (validateThirdPartyUserName as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).createThirdPartyUser.idempotencyToken).toBeDefined();
    });
  });
});
