import { requireRole, USER_ROLES } from "@hmcts/auth";
import { jurisdictionDataCy as cy, jurisdictionDataEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const REDIRECT_MAP: Record<string, string> = {
  create: "/jurisdiction-data-create",
  modify: "/jurisdiction-data-list"
};

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("jurisdiction-data/index", {
    en,
    cy,
    t,
    radioItems: t.options.map((option) => ({
      value: option.value,
      text: option.label
    })),
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const selected = req.body.action;

  if (!selected || !REDIRECT_MAP[selected]) {
    const errors = [{ text: t.noSelectionError, href: "#action" }];
    return res.render("jurisdiction-data/index", {
      en,
      cy,
      t,
      radioItems: t.options.map((option) => ({
        value: option.value,
        text: option.label
      })),
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  res.redirect(REDIRECT_MAP[selected]);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
