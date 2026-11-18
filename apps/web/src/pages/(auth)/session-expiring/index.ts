import { getRedirectType, resolveContinuePath, SESSION_WARNING_LEAD_MS } from "@hmcts/auth";
import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const isWelsh = res.locals.locale === "cy";

  // Legacy parity (pip isPermittedAnyRole): no sign-in redirect, so this page is never saved as the post-login returnTo
  if (!req.isAuthenticated() || !req.user) {
    return res.status(400).render("errors/common", {
      en: errorViewsEn.errorCommon,
      cy: errorViewsCy.errorCommon,
      t: isWelsh ? errorViewsCy.errorCommon : errorViewsEn.errorCommon
    });
  }

  const t = isWelsh ? cy : en;

  res.render("session-expiring/index", {
    en,
    cy,
    t,
    back: t.backButton,
    continueHref: resolveContinuePath(req.query.currentPath, req.user.role),
    redirectType: getRedirectType(req.user.provenance),
    warningLeadMs: SESSION_WARNING_LEAD_MS,
    isSessionExpiringPage: true
  });
};
