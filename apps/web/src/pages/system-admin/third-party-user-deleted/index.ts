import { requireRole, USER_ROLES } from "@hmcts/auth";
import { thirdPartyUserDeletedCy as cy, thirdPartyUserDeletedEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("third-party-user-deleted/index", {
    ...content
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
