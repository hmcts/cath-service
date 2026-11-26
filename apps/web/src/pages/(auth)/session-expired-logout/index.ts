import { buildSessionExpiredPath, buildSessionExpiredRedirectUrl, isRedirectType } from "@hmcts/auth";
import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

/**
 * Reached when the client-side timeout warning dialog counts down to zero. Signs the user out with the
 * provenance-specific logout. If the session has already gone (another tab), uses the allow-listed redirectType.
 */
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale;

  if (req.isAuthenticated()) {
    const redirectUrl = buildSessionExpiredRedirectUrl({
      provenance: req.user?.provenance,
      locale,
      origin: `${req.protocol}://${req.get("host")}`,
      idToken: req.user?.idToken
    });

    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect(redirectUrl);
      });
    });
    return;
  }

  const { redirectType } = req.query;
  if (isRedirectType(redirectType)) {
    return res.redirect(buildSessionExpiredPath(redirectType, locale));
  }

  res.status(400).render("errors/common", {
    en: errorViewsEn.errorCommon,
    cy: errorViewsCy.errorCommon,
    t: locale === "cy" ? errorViewsCy.errorCommon : errorViewsEn.errorCommon
  });
};
