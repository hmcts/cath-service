import type { Request, Response } from "express";
import { cy, en } from "../locales/cookie-preferences.js";
import { parseCookiePolicy, setCookieBannerSeen, setCookiePolicy } from "../middleware/cookies/cookie-helpers.js";
import type { CookiePreferences } from "../middleware/cookies/cookie-manager-middleware.js";

export const GET = async (req: Request, res: Response) => {
  const cookiePolicy = parseCookiePolicy(req.cookies?.cookie_policy);

  res.render("cookie-preferences", {
    en,
    cy,
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
