import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findThirdPartyUserById } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.query.id as string | undefined;

  if (!userId) {
    return res.redirect(`/manage-third-party-users${locale === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await findThirdPartyUserById(userId);

  if (!user) {
    return res.render("manage-third-party-user/index", {
      ...t,
      errors: [{ text: t.userNotFound }]
    });
  }

  res.render("manage-third-party-user/index", {
    ...t,
    user
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
