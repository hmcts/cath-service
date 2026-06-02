import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createThirdPartyUser } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import type { Session } from "express-session";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface ThirdPartyCreateSession extends Session {
  thirdPartyCreate?: {
    name: string;
    createdId?: string;
    createdName?: string;
  };
}

type Language = "en" | "cy";

export const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = language === "cy" ? "?lng=cy" : "";

  if (!session.thirdPartyCreate?.name) {
    return res.redirect(`/third-party-users/create${lngParam}`);
  }

  res.render("third-party-users/create/summary/index", {
    ...t,
    lngParam,
    name: session.thirdPartyCreate.name,
    changeLinkAriaLabel: t.changeLinkAriaLabel(session.thirdPartyCreate.name)
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = language === "cy" ? "?lng=cy" : "";

  if (!session.thirdPartyCreate?.name) {
    return res.redirect(`/third-party-users/create${lngParam}`);
  }

  if (session.thirdPartyCreate.createdId) {
    return res.redirect(`/third-party-users/create/confirmation${lngParam}`);
  }

  const user = await createThirdPartyUser(session.thirdPartyCreate.name);

  session.thirdPartyCreate.createdId = user.id;
  session.thirdPartyCreate.createdName = user.name;

  req.auditMetadata = {
    shouldLog: true,
    action: "CREATE_THIRD_PARTY_USER",
    entityInfo: `Name: ${user.name}`
  };

  res.redirect(`/third-party-users/create/confirmation${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
