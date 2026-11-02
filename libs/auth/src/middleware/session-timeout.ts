import type { NextFunction, Request, Response } from "express";
import { buildSessionExpiredRedirectUrl } from "../session/expiry-redirect.js";
import { getSessionTimeoutMs, isSessionExpired, SESSION_WARNING_LEAD_MS, updateLastActivity } from "../session/timeout-tracker.js";

const PUBLIC_ROUTES = ["/", "/sign-in", "/session-expired", "/logout", "/health"];

/**
 * Enforces the role-based inactivity timeout on the server. The browser only shows the warning page;
 * this check is what signs the user out, so it also covers users without JavaScript.
 */
export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_ROUTES.includes(req.path) || !req.isAuthenticated()) {
    next();
    return;
  }

  const role = req.user?.role;

  if (isSessionExpired(req.session, role)) {
    const redirectUrl = buildSessionExpiredRedirectUrl({
      provenance: req.user?.provenance,
      locale: res.locals.locale,
      origin: `${req.protocol}://${req.get("host")}`
    });

    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect(redirectUrl);
    });
    return;
  }

  updateLastActivity(req.session);
  res.locals.sessionIdleMs = getSessionTimeoutMs(role) - SESSION_WARNING_LEAD_MS;

  next();
}
