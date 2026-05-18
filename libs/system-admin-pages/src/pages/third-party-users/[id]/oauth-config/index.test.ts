import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  createKeyVaultSecretName: vi.fn((userId: string, type: string) => `third-party-${userId}-${type}`),
  getSecret: vi.fn()
}));

import { findThirdPartyUserById, getSecret } from "@hmcts/third-party-user";

const mockUser = { id: "user-1", name: "Test Corp", createdAt: new Date(), subscriptions: [] };

describe("third-party-users oauth-config form page", () => {
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

    it("should render form with empty values when no secrets exist", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(getSecret).mockResolvedValue(undefined);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/oauth-config/index",
        expect.objectContaining({
          pageTitle: "Configure OAuth credentials",
          data: { scope: "", clientId: "", clientSecret: "" }
        })
      );
    });

    it("should pre-populate form with existing secret values", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(getSecret).mockResolvedValueOnce("existing-scope").mockResolvedValueOnce("existing-client-id").mockResolvedValueOnce("existing-client-secret");

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/oauth-config/index",
        expect.objectContaining({
          data: { scope: "existing-scope", clientId: "existing-client-id", clientSecret: "existing-client-secret" }
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should re-render with errors when all fields are empty", async () => {
      // Arrange
      req.body = { scope: "", clientId: "", clientSecret: "" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/oauth-config/index",
        expect.objectContaining({
          errors: [
            { text: "Enter a scope", href: "#scope" },
            { text: "Enter a client ID", href: "#clientId" },
            { text: "Enter a client secret", href: "#clientSecret" }
          ],
          data: { scope: "", clientId: "", clientSecret: "" }
        })
      );
    });

    it("should re-render with error when scope is missing", async () => {
      // Arrange
      req.body = { scope: "", clientId: "cid", clientSecret: "csecret" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-users/[id]/oauth-config/index",
        expect.objectContaining({
          errors: [{ text: "Enter a scope", href: "#scope" }]
        })
      );
    });

    it("should store session data and redirect to summary on valid submission", async () => {
      // Arrange
      req.body = { scope: "openid", clientId: "my-client-id", clientSecret: "my-secret" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect((req.session as any).thirdPartyOauthConfig).toEqual({
        userId: "user-1",
        scope: "openid",
        clientId: "my-client-id",
        clientSecret: "my-secret"
      });
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/oauth-config/summary");
    });

    it("should redirect with Welsh param when language is cy", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.body = { scope: "openid", clientId: "my-client-id", clientSecret: "my-secret" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-users/user-1/oauth-config/summary?lng=cy");
    });
  });
});
