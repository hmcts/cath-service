import { requireRole, USER_ROLES } from "@hmcts/auth";
import { parseResendAction } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const action = parseResendAction(req.query.action);
  if (!action) {
    return res.redirect("/blob-explorer-locations");
  }

  const locale = req.query.lng === "cy" ? "cy" : "en";
  const { actions, ...content } = locale === "cy" ? cy : en;

  res.render("blob-explorer-resubmission-success/index", {
    ...content,
    ...actions[action],
    locale
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
