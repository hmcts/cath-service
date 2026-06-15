import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  if (req.session.bulkUnsubscribe) {
    req.session.bulkUnsubscribe = {};
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("bulk-unsubscribe-success/index", t);
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
