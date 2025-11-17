import { blockUserAccess, buildVerifiedUserNavigation } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";

  // Build navigation items using centralized navigation builder
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("account-home/index", { en, cy });
};

export const GET: RequestHandler[] = [blockUserAccess(), getHandler];
