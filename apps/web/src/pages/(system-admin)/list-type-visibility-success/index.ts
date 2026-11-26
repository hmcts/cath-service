import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const t = res.locals.locale === "cy" ? cy : en;
  const isHidden = req.query.state === "hidden";
  const title = isHidden ? t.successHiddenTitle : t.successShownTitle;

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.render("list-type-visibility-success/index", {
    t,
    pageTitle: title,
    title,
    body: isHidden ? t.successHiddenBody : t.successShownBody
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
