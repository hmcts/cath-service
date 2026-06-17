import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LANDING_PAGE_VARIANT: "tiles" | "radios" = "tiles";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const template = LANDING_PAGE_VARIANT === "tiles" ? "reference-data/index-tiles" : "reference-data/index-radios";

  res.render(template, {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    radioItems: content.options.map((option) => ({
      value: option.value,
      text: option.label,
      hint: { text: option.description }
    })),
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const selected = req.body.action;

  if (!selected) {
    const errors = [{ text: content.noSelectionError, href: "#action" }];
    return res.render("reference-data/index-radios", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      radioItems: content.options.map((option) => ({
        value: option.value,
        text: option.label,
        hint: { text: option.description }
      })),
      radioError: { text: content.noSelectionError },
      errors
    });
  }

  const option = content.options.find((o) => o.value === selected);
  const redirectUrl = option?.href ?? "/reference-data";
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  res.redirect(`${redirectUrl}${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
