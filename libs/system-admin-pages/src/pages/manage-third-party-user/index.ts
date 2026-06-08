import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findThirdPartyUserById } from "../../third-party-user/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const userId = req.query.id as string | undefined;

  if (!userId) {
    return res.redirect(`/manage-third-party-users${language === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await findThirdPartyUserById(userId);

  if (!user) {
    return res.render("manage-third-party-user/index", {
      ...content,
      errors: [{ text: content.userNotFound }]
    });
  }

  res.render("manage-third-party-user/index", {
    ...content,
    user
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
