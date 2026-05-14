import { requireRole, USER_ROLES } from "@hmcts/auth";
import { thirdPartySubscriptionsUpdatedCy as cy, thirdPartySubscriptionsUpdatedEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("third-party-subscriptions-updated/index", {
    ...content
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
