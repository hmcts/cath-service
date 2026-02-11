import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("../../third-party-user/queries.js", () => ({
  findThirdPartyUserById: vi.fn(),
  deleteThirdPartyUser: vi.fn()
}));

vi.mock("../../third-party-user/validation.js", () => ({
  validateRadioSelection: vi.fn()
}));

import { deleteThirdPartyUser, findThirdPartyUserById } from "../../third-party-user/queries.js";
import { validateRadioSelection } from "../../third-party-user/validation.js";

describe("delete-third-party-user page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      session: {} as any,
      auditMetadata: undefined as any
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
        "delete-third-party-user/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should render delete confirmation page with user data", async () => {
      req.query = { id: "user-123" };
      const mockUser = { id: "user-123", name: "Test User" };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findThirdPartyUserById).toHaveBeenCalledWith("user-123");
      expect(res.render).toHaveBeenCalledWith(
        "delete-third-party-user/index",
        expect.objectContaining({
          userName: "Test User",
          errors: undefined
        })
      );
    });

    it("should store user info in session", async () => {
      req.query = { id: "user-123" };
      const mockUser = { id: "user-123", name: "Test User" };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).deleteThirdPartyUser).toEqual({
        userId: "user-123",
        userName: "Test User"
      });
    });

    it("should render page in Welsh", async () => {
      req.query = { id: "user-123", lng: "cy" };
      const mockUser = { id: "user-123", name: "Test User" };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "delete-third-party-user/index",
        expect.objectContaining({
          userName: "Test User"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to manage users page when no session data", async () => {
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect with Welsh locale when no session data", async () => {
      req.query = { lng: "cy" };
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should show validation error when no radio selected", async () => {
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = {};
      (validateRadioSelection as any).mockReturnValue({ href: "#confirmDelete" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "delete-third-party-user/index",
        expect.objectContaining({
          userName: "Test User",
          errors: expect.arrayContaining([expect.objectContaining({ href: "#confirmDelete" })])
        })
      );
    });

    it("should redirect to manage user page when user selects no", async () => {
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = { confirmDelete: "no" };
      (validateRadioSelection as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(deleteThirdPartyUser).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-user?id=user-123");
      expect((req.session as any).deleteThirdPartyUser).toBeUndefined();
    });

    it("should redirect to manage user page with Welsh locale when user selects no", async () => {
      req.query = { lng: "cy" };
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = { confirmDelete: "no" };
      (validateRadioSelection as any).mockReturnValue(null);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-user?id=user-123&lng=cy");
    });

    it("should delete user and redirect to success page when confirmed", async () => {
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteThirdPartyUser as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(deleteThirdPartyUser).toHaveBeenCalledWith("user-123");
      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-deleted");
      expect((req.session as any).deleteThirdPartyUser).toBeUndefined();
    });

    it("should redirect to success page with Welsh locale after deletion", async () => {
      req.query = { lng: "cy" };
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteThirdPartyUser as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-deleted?lng=cy");
    });

    it("should set audit metadata on deletion", async () => {
      (req.session as any).deleteThirdPartyUser = {
        userId: "user-123",
        userName: "Test User"
      };
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (deleteThirdPartyUser as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "DELETE_THIRD_PARTY_USER",
        entityInfo: "ID: user-123, Name: Test User"
      });
    });
  });
});
