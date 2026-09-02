import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findThirdPartyUserById } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const id = req.params.id as string;

  const user = await findThirdPartyUserById(id);

  if (!user) {
    return res.redirect(`/third-party-subscribers${lngParam}`);
  }

  res.render("third-party-subscribers/[id]/manage/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId: user.id,
    name: user.name,
    createdAt: user.createdAt.toLocaleDateString("en-GB"),
    subscriptionCount: user.subscriptions.length
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
