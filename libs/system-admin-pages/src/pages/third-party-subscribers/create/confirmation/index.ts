import { requireRole, USER_ROLES } from "@hmcts/auth";
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

export const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  const createdName = session.thirdPartyCreate?.createdName ?? "";

  delete session.thirdPartyCreate;

  res.render("third-party-subscribers/create/confirmation/index", {
    ...t,
    en,
    cy,
    lngParam,
    createdName
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
