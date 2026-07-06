import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LANDING_PAGE_VARIANT: "tiles" | "radios" = "tiles";

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const template = LANDING_PAGE_VARIANT === "tiles" ? "reference-data/index-tiles" : "reference-data/index-radios";

  res.render(template, {
    en,
    cy,
    t,
    radioItems: t.options.map((option) => ({
      value: option.value,
      text: option.label,
      hint: { text: option.description }
    })),
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const selected = req.body.action;

  if (!selected) {
    const errors = [{ text: t.noSelectionError, href: "#action" }];
    return res.render("reference-data/index-radios", {
      en,
      cy,
      t,
      radioItems: t.options.map((option) => ({
        value: option.value,
        text: option.label,
        hint: { text: option.description }
      })),
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  const option = t.options.find((o) => o.value === selected);
  const redirectUrl = option?.href ?? "/reference-data";
  res.redirect(redirectUrl);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
