import { requireRole, USER_ROLES } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { createKeyVaultSecretName, findThirdPartyUserById, setSecret } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { AuditLogAction } from "../../../../../audit-log/logger.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

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
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const config = (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;
  if (!config || config.userId !== id) {
    return res.redirect(`/third-party-subscribers/${id}/oauth-config${lngParam}`);
  }

  res.render("third-party-subscribers/[id]/oauth-config/summary/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId: id,
    config
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const config = (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;
  if (!config || config.userId !== id) {
    return res.redirect(`/third-party-subscribers/${id}/oauth-config${lngParam}`);
  }

  const user = (await findThirdPartyUserById(id)) ?? (await prisma.legacyThirdPartyUser.findUnique({ where: { id }, select: { id: true, name: true } }));
  if (!user) {
    return res.redirect(`/third-party-subscribers${lngParam}`);
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
    action: AuditLogAction.UPDATE_THIRD_PARTY_OAUTH_CONFIG,
    entityInfo: `Name: ${user.name}, ID: ${id}`
  };

  res.redirect(`/third-party-subscribers/${id}/oauth-config/success${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
