import { requireRole, USER_ROLES } from "@hmcts/auth";
import { thirdPartyUserCreatedCy as cy, thirdPartyUserCreatedEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

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

  if (!session.createThirdPartyUser?.createdUserId) {
    return res.redirect(`/create-third-party-user${language === "cy" ? "?lng=cy" : ""}`);
  }

  const userName = session.createThirdPartyUser.name;

  delete session.createThirdPartyUser;

  res.render("third-party-user-created/index", {
    ...content,
    userName
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
