import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findThirdPartyUserById } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const { id } = req.params;

  const user = await findThirdPartyUserById(id);

  if (!user) {
    return res.redirect(`/third-party-users${lngParam}`);
  }

  const sensitivities = [...new Set(user.subscriptions.map((s) => s.sensitivity))];
  const sensitivityDisplay = sensitivities.length > 0 ? sensitivities.join(", ") : "—";

  res.render("third-party-users/[id]/manage/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId: user.id,
    name: user.name,
    createdAt: user.createdAt.toLocaleDateString("en-GB"),
    subscriptionCount: user.subscriptions.length,
    sensitivity: sensitivityDisplay
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
