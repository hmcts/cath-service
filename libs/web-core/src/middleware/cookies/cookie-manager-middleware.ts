import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { COOKIE_BANNER_SEEN, COOKIE_POLICY_NAME, parseCookiePolicy } from "./cookie-helpers.js";

export async function configureCookieManager(app: Express, options: CookieManagerOptions): Promise<void> {
  app.use(createCookieManagerMiddleware(options));
}

function createCookieManagerMiddleware(options: CookieManagerOptions): RequestHandler {
  const cookiePath = options.preferencesPath || "/cookies";
  const suppressPaths = [cookiePath, ...(options.policyPath ? [options.policyPath] : [])];

  return (req: Request, res: Response, next: NextFunction) => {
    const cookiePolicy = parseCookiePolicy(req.cookies?.[COOKIE_POLICY_NAME]);
    const bannerSeen = req.cookies?.[COOKIE_BANNER_SEEN] === "true";

    const isOnCookiesPage = suppressPaths.some((p) => req.path === p || req.path?.startsWith(`${p}/`));

    const state: CookieManagerState = {
      cookiesAccepted: Object.keys(cookiePolicy).length > 0,
      cookiePreferences: cookiePolicy,
      showBanner: !isOnCookiesPage && !bannerSeen && Object.keys(cookiePolicy).length === 0
    };

    res.locals.cookieManager = state;
    res.locals.cookieConfig = options;

    next();
  };
}

export interface CookieManagerOptions {
  categories?: {
    analytics?: string[];
    preferences?: string[];
    [key: string]: string[] | undefined;
  };
  preferencesPath?: string;
  policyPath?: string;
}

export interface CookiePreferences {
  analytics?: boolean;
  preferences?: boolean;
  [key: string]: boolean | undefined;
}

export interface CookieManagerState {
  cookiesAccepted?: boolean;
  cookiePreferences?: CookiePreferences;
  showBanner?: boolean;
}
