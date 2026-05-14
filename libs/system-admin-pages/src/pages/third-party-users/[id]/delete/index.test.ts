import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  deleteThirdPartyUser: vi.fn()
}));

import { deleteThirdPartyUser, findThirdPartyUserById } from "@hmcts/third-party-user";

const mockUser = { id: "user-1", name: "Test Corp", createdAt: new Date(), subscriptions: [] };

describe("third-party-users delete page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "user-1" } };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users");
    });

    it("should render delete confirmation page with user name in title", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/delete/index",
        expect.objectContaining({
          pageTitle: "Are you sure you want to delete Test Corp?",
          userName: "Test Corp"
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should re-render with error when no radio selected", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = {};

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/delete/index",
        expect.objectContaining({
          errors: [{ text: "Select yes or no to continue", href: "#confirm-delete" }]
        })
      );
    });

    it("should redirect to manage user page when No is selected", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      req.body = { confirmDelete: "no" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(deleteThirdPartyUser).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/manage");
    });

    it("should delete user and redirect to success page when Yes is selected", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(deleteThirdPartyUser).mockResolvedValue(undefined);
      req.body = { confirmDelete: "yes" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(deleteThirdPartyUser).toHaveBeenCalledWith("user-1");
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/delete/success");
    });

    it("should set audit metadata on delete", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(deleteThirdPartyUser).mockResolvedValue(undefined);
      req.body = { confirmDelete: "yes" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "DELETE_THIRD_PARTY_USER",
        entityInfo: "Name: Test Corp, ID: user-1"
      });
    });

    it("should redirect to Welsh success page on delete with Welsh param", async () => {
      // Arrange
      req.query = { lng: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(deleteThirdPartyUser).mockResolvedValue(undefined);
      req.body = { confirmDelete: "yes" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/delete/success?lng=cy");
    });
  });
});
