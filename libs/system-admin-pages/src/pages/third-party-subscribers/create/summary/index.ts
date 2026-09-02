import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createThirdPartyUser } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import type { Session } from "express-session";
import { AuditLogAction } from "../../../../audit-log/logger.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface ThirdPartyCreateSession extends Session {
  thirdPartyCreate?: {
    name: string;
    createdId?: string;
    createdName?: string;
  };
}

export const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  if (!session.thirdPartyCreate?.name) {
    return res.redirect(`/third-party-subscribers/create${lngParam}`);
  }

  res.render("third-party-subscribers/create/summary/index", {
    ...t,
    en,
    cy,
    lngParam,
    name: session.thirdPartyCreate.name,
    changeLinkAriaLabel: t.changeLinkAriaLabel(session.thirdPartyCreate.name)
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  if (!session.thirdPartyCreate?.name) {
    return res.redirect(`/third-party-subscribers/create${lngParam}`);
  }

  if (session.thirdPartyCreate.createdId) {
    return res.redirect(`/third-party-subscribers/create/confirmation${lngParam}`);
  }

  const user = await createThirdPartyUser(session.thirdPartyCreate.name);

  session.thirdPartyCreate.createdId = user.id;
  session.thirdPartyCreate.createdName = user.name;

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.CREATE_THIRD_PARTY_USER,
    entityInfo: `Name: ${user.name}`
  };

  res.redirect(`/third-party-subscribers/create/confirmation${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
