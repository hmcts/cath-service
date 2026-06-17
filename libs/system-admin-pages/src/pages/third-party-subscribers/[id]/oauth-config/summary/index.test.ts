import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

vi.mock("@hmcts/third-party-user", () => ({
  findThirdPartyUserById: vi.fn(),
  createKeyVaultSecretName: vi.fn((userId: string, type: string) => `third-party-${userId}-${type}`),
  setSecret: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    legacyThirdPartyUser: {
      findUnique: vi.fn()
    }
  }
}));

import { findThirdPartyUserById, setSecret } from "@hmcts/third-party-user";

const mockUser = { id: "user-1", name: "Test Corp", createdAt: new Date(), subscriptions: [] };

const mockOauthConfig = {
  userId: "user-1",
  destinationUrl: "https://dest.example.com",
  tokenUrl: "https://token.example.com",
  scope: "openid",
  clientId: "my-client-id",
  clientSecret: "my-secret"
};

describe("third-party-subscribers oauth-config summary page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: { thirdPartyOauthConfig: mockOauthConfig } as never,
      params: { id: "user-1" }
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("getHandler", () => {
    it("should redirect to form when no session config", async () => {
      // Arrange
      req.session = {} as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/user-1/oauth-config");
    });

    it("should redirect to form when session userId does not match", async () => {
      // Arrange
      req.session = { thirdPartyOauthConfig: { ...mockOauthConfig, userId: "other-user" } } as never;

      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/user-1/oauth-config");
    });

    it("should render summary page with config from session", async () => {
      // Act
      await getHandler(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "third-party-subscribers/[id]/oauth-config/summary/index",
        expect.objectContaining({
          pageTitle: "Check your answers",
          config: mockOauthConfig
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to form when no session config", async () => {
      // Arrange
      req.session = {} as never;

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/user-1/oauth-config");
    });

    it("should redirect to users list when user not found", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers");
    });

    it("should write all secrets to Key Vault", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(setSecret).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(setSecret).toHaveBeenCalledWith("third-party-user-1-destination-url", "https://dest.example.com");
      expect(setSecret).toHaveBeenCalledWith("third-party-user-1-token-url", "https://token.example.com");
      expect(setSecret).toHaveBeenCalledWith("third-party-user-1-scope", "openid");
      expect(setSecret).toHaveBeenCalledWith("third-party-user-1-client-id", "my-client-id");
      expect(setSecret).toHaveBeenCalledWith("third-party-user-1-client-secret", "my-secret");
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/user-1/oauth-config/success");
    });

    it("should clear session data after saving", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(setSecret).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect((req.session as any).thirdPartyOauthConfig).toBeUndefined();
    });

    it("should set audit metadata on save", async () => {
      // Arrange
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(setSecret).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(req.auditMetadata).toMatchObject({
        shouldLog: true,
        action: "Update third party OAuth config",
        entityInfo: "Name: Test Corp, ID: user-1"
      });
    });

    it("should redirect to Welsh success page when language is cy", async () => {
      // Arrange
      (res as any).locals = { locale: "cy" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as never);
      vi.mocked(setSecret).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscribers/user-1/oauth-config/success?lng=cy");
    });
  });
});
