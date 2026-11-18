import { isRedirectType, RE_SIGN_IN_URLS } from "@hmcts/auth";
import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const isWelsh = res.locals.locale === "cy";
  const { reSignInUrl } = req.query;

  if (!isRedirectType(reSignInUrl)) {
    return res.status(400).render("errors/common", {
      en: errorViewsEn.errorCommon,
      cy: errorViewsCy.errorCommon,
      t: isWelsh ? errorViewsCy.errorCommon : errorViewsEn.errorCommon
    });
  }

  res.render("session-expired/index", {
    en,
    cy,
    t: isWelsh ? cy : en,
    signInUrl: RE_SIGN_IN_URLS[reSignInUrl]
  });
};
