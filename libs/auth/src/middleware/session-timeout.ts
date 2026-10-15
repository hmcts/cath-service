import type { NextFunction, Request, Response } from "express";
import { buildCftIdamLogoutUrl } from "../cft-idam/logout-url.js";
import { getCftIdamConfig } from "../config/cft-idam-config.js";
import { getTimeUntilExpiry, isSessionExpired, updateLastActivity } from "../session/timeout-tracker.js";

/**
 * Middleware to track session inactivity and enforce timeout
 * Checks if session has expired and updates last activity timestamp
 */
export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip timeout tracking for public routes
  const publicRoutes = ["/", "/sign-in", "/session-expired", "/logout", "/health"];
  if (publicRoutes.includes(req.path)) {
    next();
    return;
  }

  // Skip if user is not authenticated
  if (!req.isAuthenticated()) {
    next();
    return;
  }

  // Check if session has expired
  if (isSessionExpired(req.session)) {
    // Preserve the locale from cookie before destroying session
    const locale = req.cookies?.locale;
    const sessionExpiredUrl = locale === "cy" ? "/session-expired?lng=cy" : "/session-expired";
    // CFT IDAM users must also end their IDAM session so they re-authenticate on next sign in
    const redirectUrl = req.user?.provenance === "CFT_IDAM" ? buildCftIdamLogoutUrl(sessionExpiredUrl, getCftIdamConfig()) : sessionExpiredUrl;

    // Destroy session
    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect(redirectUrl);
    });
    return;
  }

  // Update last activity timestamp
  updateLastActivity(req.session);

  // Inject timeout data into response locals for client-side tracking
  const timeUntilExpiry = getTimeUntilExpiry(req.session);
  if (timeUntilExpiry !== null) {
    res.locals.sessionTimeoutMs = timeUntilExpiry;
  }

  next();
}
