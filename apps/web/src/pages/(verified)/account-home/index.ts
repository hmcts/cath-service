import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { accountHomeCy as cy, accountHomeEn as en } from "@hmcts/verified-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";

  // Build navigation items using centralized navigation builder
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("account-home/index", { en, cy });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
