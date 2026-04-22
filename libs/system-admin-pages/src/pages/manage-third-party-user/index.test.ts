import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("../../third-party-user/queries.js", () => ({
  findThirdPartyUserById: vi.fn(),
  getHighestSensitivity: vi.fn()
}));

import { findThirdPartyUserById, getHighestSensitivity } from "../../third-party-user/queries.js";

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
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to manage users page when no id provided", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect to manage users page with Welsh locale when no id", async () => {
      req.query = { lng: "cy" };
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
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [{ listTypeId: 1, sensitivity: "PUBLIC" }]
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);
      (getHighestSensitivity as any).mockResolvedValue("PUBLIC");

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findThirdPartyUserById).toHaveBeenCalledWith("user-123");
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          user: mockUser,
          highestSensitivity: "PUBLIC"
        })
      );
    });

    it("should render user details in Welsh", async () => {
      req.query = { id: "user-123", lng: "cy" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: []
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);
      (getHighestSensitivity as any).mockResolvedValue(null);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          user: mockUser
        })
      );
    });

    it("should calculate highest sensitivity for user subscriptions", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [{ listTypeId: 1, sensitivity: "CLASSIFIED" }]
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);
      (getHighestSensitivity as any).mockResolvedValue("CLASSIFIED");

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(getHighestSensitivity).toHaveBeenCalledWith(mockUser.subscriptions);
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-user/index",
        expect.objectContaining({
          highestSensitivity: "CLASSIFIED"
        })
      );
    });
  });
});
