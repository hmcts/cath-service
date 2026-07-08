import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";

  res.render("third-party-subscribers/[id]/delete/success/index", {
    ...t,
    en,
    cy,
    lngParam
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
