import { requireRole, USER_ROLES } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { createKeyVaultSecretName, findThirdPartyUserById, getSecret } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
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
  const id = req.params.id as string;

  const user = (await findThirdPartyUserById(id)) ?? (await prisma.legacyThirdPartyUser.findUnique({ where: { id }, select: { id: true } }));
  if (!user) {
    return res.redirect(`/third-party-subscribers${lngParam}`);
  }

  const sessionConfig = (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig;
  if (sessionConfig && sessionConfig.userId === id) {
    return res.render("third-party-subscribers/[id]/oauth-config/index", {
      ...t,
      en,
      cy,
      lngParam,
      userId: user.id,
      isExisting: sessionConfig.isExisting,
      buttonText: sessionConfig.isExisting ? t.updateButton : t.createButton,
      data: {
        destinationUrl: sessionConfig.destinationUrl,
        tokenUrl: sessionConfig.tokenUrl,
        scope: sessionConfig.scope,
        clientId: sessionConfig.clientId,
        clientSecret: sessionConfig.clientSecret
      }
    });
  }

  const [destinationUrl, tokenUrl, scope, clientId, clientSecret] = await Promise.all([
    getSecret(createKeyVaultSecretName(id, "destination-url")),
    getSecret(createKeyVaultSecretName(id, "token-url")),
    getSecret(createKeyVaultSecretName(id, "scope")),
    getSecret(createKeyVaultSecretName(id, "client-id")),
    getSecret(createKeyVaultSecretName(id, "client-secret"))
  ]);

  const isExisting = !!(destinationUrl || tokenUrl || scope || clientId || clientSecret);

  res.render("third-party-subscribers/[id]/oauth-config/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId: user.id,
    isExisting,
    buttonText: isExisting ? t.updateButton : t.createButton,
    data: {
      destinationUrl: destinationUrl ?? "",
      tokenUrl: tokenUrl ?? "",
      scope: scope ?? "",
      clientId: clientId ?? "",
      clientSecret: clientSecret ?? ""
    }
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const id = req.params.id as string;

  const { destinationUrl, tokenUrl, scope, clientId, clientSecret } = req.body as {
    destinationUrl: string;
    tokenUrl: string;
    scope: string;
    clientId: string;
    clientSecret: string;
  };
  const isExisting = req.body.isExisting === "true";

  const errors: Array<{ text: string; href: string }> = [];
  if (!destinationUrl?.trim()) errors.push({ text: t.destinationUrlRequired, href: "#destinationUrl" });
  if (!tokenUrl?.trim()) errors.push({ text: t.tokenUrlRequired, href: "#tokenUrl" });
  if (!scope?.trim()) errors.push({ text: t.scopeRequired, href: "#scope" });
  if (!clientId?.trim()) errors.push({ text: t.clientIdRequired, href: "#clientId" });
  if (!clientSecret?.trim()) errors.push({ text: t.clientSecretRequired, href: "#clientSecret" });

  if (errors.length > 0) {
    return res.render("third-party-subscribers/[id]/oauth-config/index", {
      ...t,
      en,
      cy,
      lngParam,
      userId: id,
      isExisting,
      buttonText: isExisting ? t.updateButton : t.createButton,
      errors,
      data: { destinationUrl, tokenUrl, scope, clientId, clientSecret }
    });
  }

  (req.session as ThirdPartyOauthConfigSession).thirdPartyOauthConfig = {
    userId: id,
    destinationUrl: destinationUrl.trim(),
    tokenUrl: tokenUrl.trim(),
    scope: scope.trim(),
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    isExisting
  };

  res.redirect(`/third-party-subscribers/${id}/oauth-config/summary${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
