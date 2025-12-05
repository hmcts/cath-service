import type { Response } from "express";
import type { CookiePreferences } from "./cookie-manager-middleware.js";

const COOKIE_POLICY_NAME = "cookie_policy";
const COOKIE_BANNER_SEEN = "cookies_preferences_set";

export function parseCookiePolicy(cookiePolicyValue: string | undefined): CookiePreferences {
  if (!cookiePolicyValue) {
    return {};
  }

  try {
    return JSON.parse(cookiePolicyValue);
  } catch {
    return {};
  }
}

export function setCookiePolicy(res: Response, preferences: CookiePreferences): void {
  const value = JSON.stringify(preferences);
  res.cookie(COOKIE_POLICY_NAME, value, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function setCookieBannerSeen(res: Response): void {
  res.cookie(COOKIE_BANNER_SEEN, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
}

export { COOKIE_POLICY_NAME, COOKIE_BANNER_SEEN };
