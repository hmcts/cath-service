import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    findThirdPartyUserById: vi.fn()
  };
});

import { findThirdPartyUserById } from "@hmcts/system-admin-pages";

describe("manage-third-party-user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
  });

  describe("GET", () => {
    it("should redirect to manage users page when no id provided", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect to manage users page with Welsh locale when no id", async () => {
      (res as any).locals = { locale: "cy" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should render error when user not found", async () => {
      req.query = { id: "non-existent-id" };
      (findThirdPartyUserById as any).mockResolvedValue(null);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should render user details in English", async () => {
      req.query = { id: "00000000-0000-0000-0000-000000000001" };
      const mockUser = {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
        subscriptions: [{ listTypeId: 1 }]
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findThirdPartyUserById).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          user: mockUser
        })
      );
    });

    it("should render user details in Welsh", async () => {
      req.query = { id: "00000000-0000-0000-0000-000000000001" };
      (res as any).locals = { locale: "cy" };
      const mockUser = {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
        subscriptions: []
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          user: mockUser
        })
      );
    });
  });
});
