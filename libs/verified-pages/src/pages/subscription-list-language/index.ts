import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import "../../types/session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("subscription-list-language/index", {
    ...t,
    data: req.session.listTypeSubscription || {},
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { language } = req.body;

  const ALLOWED_LANGUAGES = ["ENGLISH", "WELSH", "BOTH"];

  if (!language || !ALLOWED_LANGUAGES.includes(language)) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("subscription-list-language/index", {
      ...t,
      errors: [{ text: t.errorRequired, href: "#language" }],
      data: req.body,
      csrfToken: getCsrfToken(req)
    });
  }

  if (!req.session.listTypeSubscription) {
    req.session.listTypeSubscription = {};
  }

  req.session.listTypeSubscription.language = language;

  req.session.save((err: Error | null) => {
    if (err) {
      console.error("Error saving session", { errorMessage: err.message });

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("subscription-list-language/index", {
        ...t,
        errors: [{ text: t.errorSessionSave, href: "#language" }],
        data: req.body,
        csrfToken: getCsrfToken(req)
      });
    }
    res.redirect("/subscription-confirm");
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
