import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  createKeyVaultSecretName: vi.fn((userId: string, type: string) => `third-party-${userId}-${type}`),
  getSecret: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    legacyThirdPartyUser: {
      findUnique: vi.fn()
    }
  }
}));

import { findThirdPartyUserById, getSecret } from "@hmcts/third-party-user";

const mockUser = { id: "00000000-0000-0000-0000-000000000001", name: "Test Corp", createdAt: new Date(), subscriptions: [] };

describe("third-party-subscribers oauth-config form page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as never, params: { id: "00000000-0000-0000-0000-000000000001" } };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("getHandler", () => {
    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
    });

    it("should render form with empty values and Create button when no secrets exist", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(getSecret).mockResolvedValue(undefined);

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/index",
        expect.objectContaining({
          pageTitle: "Configure OAuth credentials",
          isExisting: false,
          buttonText: "Create",
          data: { destinationUrl: "", tokenUrl: "", scope: "", clientId: "", clientSecret: "" }
        })
      );
    });

    it("should pre-populate form with existing values including actual secret with Update button", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(getSecret)
        .mockResolvedValueOnce("https://example.com/destination")
        .mockResolvedValueOnce("https://example.com/token")
        .mockResolvedValueOnce("existing-scope")
        .mockResolvedValueOnce("existing-client-id")
        .mockResolvedValueOnce("existing-client-secret");

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/index",
        expect.objectContaining({
          isExisting: true,
          buttonText: "Update",
          data: {
            destinationUrl: "https://example.com/destination",
            tokenUrl: "https://example.com/token",
            scope: "existing-scope",
            clientId: "existing-client-id",
            clientSecret: "existing-client-secret"
          }
        })
      );
    });

    it("should pre-populate form with session values when returning from summary via Change link", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      (req.session as any).thirdPartyOauthConfig = {
        userId: "00000000-0000-0000-0000-000000000001",
        destinationUrl: "https://session.example.com/destination",
        tokenUrl: "https://session.example.com/token",
        scope: "session-scope",
        clientId: "session-client-id",
        clientSecret: "session-client-secret",
        isExisting: false
      };

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(getSecret).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/index",
        expect.objectContaining({
          isExisting: false,
          buttonText: "Create",
          data: {
            destinationUrl: "https://session.example.com/destination",
            tokenUrl: "https://session.example.com/token",
            scope: "session-scope",
            clientId: "session-client-id",
            clientSecret: "session-client-secret"
          }
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should re-render with errors when all fields are empty", async () => {
      // Arrange
      req.body = { destinationUrl: "", tokenUrl: "", scope: "", clientId: "", clientSecret: "", isExisting: "false" };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/index",
        expect.objectContaining({
          errors: [
            { text: "Enter a destination URL", href: "#destinationUrl" },
            { text: "Enter a token URL", href: "#tokenUrl" },
            { text: "Enter a scope", href: "#scope" },
            { text: "Enter a client ID", href: "#clientId" },
            { text: "Enter a client secret", href: "#clientSecret" }
          ],
          data: { destinationUrl: "", tokenUrl: "", scope: "", clientId: "", clientSecret: "" }
        })
      );
    });

    it("should re-render with error when scope is missing", async () => {
      // Arrange
      req.body = {
        destinationUrl: "https://dest.example.com",
        tokenUrl: "https://token.example.com",
        scope: "",
        clientId: "cid",
        clientSecret: "csecret",
        isExisting: "false"
      };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/index",
        expect.objectContaining({
          errors: [{ text: "Enter a scope", href: "#scope" }]
        })
      );
    });

    it("should store session data and redirect to summary on valid submission", async () => {
      // Arrange
      req.body = {
        destinationUrl: "https://dest.example.com",
        tokenUrl: "https://token.example.com",
        scope: "openid",
        clientId: "my-client-id",
        clientSecret: "my-secret",
        isExisting: "false"
      };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect((req.session as any).thirdPartyOauthConfig).toEqual({
        userId: "00000000-0000-0000-0000-000000000001",
        destinationUrl: "https://dest.example.com",
        tokenUrl: "https://token.example.com",
        scope: "openid",
        clientId: "my-client-id",
        clientSecret: "my-secret",
        isExisting: false
      });
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/00000000-0000-0000-0000-000000000001/oauth-config/summary");
    });

    it("should redirect with Welsh param when language is cy", async () => {
      // Arrange
      (res as any).locals = { locale: "cy" };
      req.body = {
        destinationUrl: "https://dest.example.com",
        tokenUrl: "https://token.example.com",
        scope: "openid",
        clientId: "my-client-id",
        clientSecret: "my-secret",
        isExisting: "false"
      };

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/00000000-0000-0000-0000-000000000001/oauth-config/summary?lng=cy");
    });
  });
});
