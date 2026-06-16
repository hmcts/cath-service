import { requireRole, USER_ROLES } from "@hmcts/auth";
import { validateName } from "@hmcts/third-party-user";
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

  res.render("third-party-users/create/index", {
    ...t,
    en,
    cy,
    lngParam,
    data: { name: session.thirdPartyCreate?.name ?? "" }
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as ThirdPartyCreateSession;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  const name = (req.body.name as string | undefined) ?? "";
  const error = validateName(name);

  if (error) {
    return res.render("third-party-users/create/index", {
      ...t,
      en,
      cy,
      lngParam,
      errors: [error],
      data: { name }
    });
  }

  if (!session.thirdPartyCreate) {
    session.thirdPartyCreate = { name };
  } else {
    session.thirdPartyCreate.name = name;
    delete session.thirdPartyCreate.createdId;
  }

  res.redirect(`/third-party-users/create/summary${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
