import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createThirdPartyUser } from "../../third-party-user/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface CreateThirdPartyUserSession {
  createThirdPartyUser?: {
    name: string;
    idempotencyToken: string;
    createdUserId?: string;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as CreateThirdPartyUserSession;

  if (!session.createThirdPartyUser) {
    return res.redirect(`/create-third-party-user${language === "cy" ? "?lng=cy" : ""}`);
  }

  res.render("create-third-party-user-summary/index", {
    ...content,
    name: session.createThirdPartyUser.name
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const session = req.session as CreateThirdPartyUserSession;

  if (!session.createThirdPartyUser) {
    return res.redirect(`/create-third-party-user${language === "cy" ? "?lng=cy" : ""}`);
  }

  if (session.createThirdPartyUser.createdUserId) {
    return res.redirect(`/third-party-user-created${language === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await createThirdPartyUser(session.createThirdPartyUser.name);

  session.createThirdPartyUser.createdUserId = user.id;

  req.auditMetadata = {
    shouldLog: true,
    action: "CREATE_THIRD_PARTY_USER",
    entityInfo: `ID: ${user.id}, Name: ${user.name}`
  };

  res.redirect(`/third-party-user-created${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
