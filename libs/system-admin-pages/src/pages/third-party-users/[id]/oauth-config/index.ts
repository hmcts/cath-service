import { requireRole, USER_ROLES } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { createKeyVaultSecretName, findThirdPartyUserById, getSecret } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

type Language = "en" | "cy";

interface ThirdPartyOauthConfigSession {
  thirdPartyOauthConfig?: {
    userId: string;
    scope: string;
    clientId: string;
    clientSecret: string;
  };
}

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const user =
    (await findThirdPartyUserById(id)) ??
    (await prisma.legacyThirdPartyUser.findUnique({ where: { id }, select: { id: true } }));
  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  const [scope, clientId, clientSecret] = await Promise.all([
    getSecret(createKeyVaultSecretName(id, "scope")),
    getSecret(createKeyVaultSecretName(id, "client-id")),
    getSecret(createKeyVaultSecretName(id, "client-secret"))
  ]);

  res.render("third-party-users/[id]/oauth-config/index", {
    ...t,
    lngParam,
    userId: user.id,
    data: {
      scope: scope ?? "",
      clientId: clientId ?? "",
      clientSecret: clientSecret ?? ""
    }
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const lngParam = language === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const { scope, clientId, clientSecret } = req.body as { scope: string; clientId: string; clientSecret: string };

  const errors: Array<{ text: string; href: string }> = [];
  if (!scope?.trim()) errors.push({ text: t.scopeRequired, href: "#scope" });
  if (!clientId?.trim()) errors.push({ text: t.clientIdRequired, href: "#clientId" });
  if (!clientSecret?.trim()) errors.push({ text: t.clientSecretRequired, href: "#clientSecret" });

  if (errors.length > 0) {
    return res.render("third-party-users/[id]/oauth-config/index", {
      ...t,
      lngParam,
      userId: id,
      errors,
      data: { scope, clientId, clientSecret }
    });
  }

  (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig = {
    userId: id,
    scope: scope.trim(),
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim()
  };

  res.redirect(`/third-party-users/${id}/oauth-config/summary${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
