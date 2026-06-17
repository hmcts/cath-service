import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const REDIRECT_MAP: Record<string, string> = {
  create: "/jurisdiction-data-create",
  modify: "/jurisdiction-data-list"
};

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("jurisdiction-data/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    radioItems: content.options.map((option) => ({
      value: option.value,
      text: option.label
    })),
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const selected = req.body.action;

  if (!selected || !REDIRECT_MAP[selected]) {
    const errors = [{ text: content.noSelectionError, href: "#action" }];
    return res.render("jurisdiction-data/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      radioItems: content.options.map((option) => ({
        value: option.value,
        text: option.label
      })),
      radioError: { text: content.noSelectionError },
      errors
    });
  }

  const langSuffix = language === "cy" ? "?lng=cy" : "";
  res.redirect(`${REDIRECT_MAP[selected]}${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
