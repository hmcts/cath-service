import { requireRole, USER_ROLES } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { createKeyVaultSecretName, findThirdPartyUserById, setSecret } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

type Language = "en" | "cy";

interface ThirdPartyOauthConfigSession {
  thirdPartyOauthConfig?: {
    userId: string;
    destinationUrl: string;
    tokenUrl: string;
    scope: string;
    clientId: string;
    clientSecret: string;
    isExisting: boolean;
  };
}

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const config = (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;
  if (!config || config.userId !== id) {
    return res.redirect(`/third-party-users/${id}/oauth-config${lngParam}`);
  }

  res.render("third-party-users/[id]/oauth-config/summary/index", {
    ...t,
    lngParam,
    userId: id,
    config
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const config = (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;
  if (!config || config.userId !== id) {
    return res.redirect(`/third-party-users/${id}/oauth-config${lngParam}`);
  }

  const user = (await findThirdPartyUserById(id)) ?? (await prisma.legacyThirdPartyUser.findUnique({ where: { id }, select: { id: true, name: true } }));
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  await Promise.all([
    setSecret(createKeyVaultSecretName(id, "destination-url"), config.destinationUrl),
    setSecret(createKeyVaultSecretName(id, "token-url"), config.tokenUrl),
    setSecret(createKeyVaultSecretName(id, "scope"), config.scope),
    setSecret(createKeyVaultSecretName(id, "client-id"), config.clientId),
    setSecret(createKeyVaultSecretName(id, "client-secret"), config.clientSecret)
  ]);

  delete (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;

  req.auditMetadata = {
    shouldLog: true,
    action: "UPDATE_THIRD_PARTY_OAUTH_CONFIG",
    entityInfo: `Name: ${user.name}, ID: ${id}`
  };

  res.redirect(`/third-party-users/${id}/oauth-config/success${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
