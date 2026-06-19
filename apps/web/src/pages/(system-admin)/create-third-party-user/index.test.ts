import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    findThirdPartyUserByName: vi.fn(),
    validateThirdPartyUserName: vi.fn()
  };
});

import { findThirdPartyUserByName, validateThirdPartyUserName } from "@hmcts/system-admin-pages";

describe("create-third-party-user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findThirdPartyUserByName).mockResolvedValue(null);

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

    it("should show duplicate name error when user with same name already exists", async () => {
      req.body = { name: "Existing User" };
      (validateThirdPartyUserName as any).mockReturnValue(null);
      vi.mocked(findThirdPartyUserByName).mockResolvedValue({ id: "existing-id", name: "Existing User" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#name" })]),
          name: "Existing User"
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should be case-insensitive for duplicate name check", async () => {
      req.body = { name: "existing user" };
      (validateThirdPartyUserName as any).mockReturnValue(null);
      vi.mocked(findThirdPartyUserByName).mockResolvedValue({ id: "existing-id", name: "Existing User" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#name" })])
        })
      );
    });
  });
});
