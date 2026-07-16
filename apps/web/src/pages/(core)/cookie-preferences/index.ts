import { type CookiePreferences, cookiePreferencesCy, cookiePreferencesEn, parseCookiePolicy, setCookieBannerSeen, setCookiePolicy } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cookiePreferencesCy : cookiePreferencesEn;

  res.render("cookie-preferences/index", {
    en: cookiePreferencesEn,
    cy: cookiePreferencesCy,
    pageTitle: t.title,
    cookiePreferences: cookiePolicy,
    categories: res.locals.cookieConfig?.categories,
    saved: req.query.saved === "true"
  });
};

export const POST = async (req: Request, res: Response) => {
  const preferences: CookiePreferences = {};
  const categories = res.locals.cookieConfig?.categories || {};

  for (const category of Object.keys(categories)) {
    const isEnabled = req.body?.[category] === "on" || req.body?.[category] === true;
    preferences[category] = isEnabled;
  }

  setCookiePolicy(res, preferences);
  setCookieBannerSeen(res);

  res.redirect("/cookie-preferences?saved=true");
};
