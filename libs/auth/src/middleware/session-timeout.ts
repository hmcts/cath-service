import type { NextFunction, Request, Response } from "express";
import { buildSessionExpiredPath, getRedirectType } from "../session/expiry-redirect.js";
import { buildSignOutRedirectUrl } from "../session/sign-out-redirect.js";
import { getSessionIdleMs, isSessionExpired, SESSION_WARNING_LEAD_MS, updateLastActivity } from "../session/timeout-tracker.js";

/**
 * Enforces the role-based inactivity timeout on every signed-in request, as legacy pip-frontend's
 * globalAuthGiver does. An expired session is signed out through the same provider logout as /logout,
 * but returns to /session-expired so the user is told it was due to inactivity, whether the browser
 * dialog or this middleware noticed first (JS off, throttled background tab, laptop sleep).
 */
export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    next();
    return;
  }

  const role = req.user?.role;
  const provenance = req.user?.provenance;

  if (isSessionExpired(req.session, role)) {
    const redirectUrl = buildSignOutRedirectUrl({
      provenance,
      locale: res.locals.locale,
      origin: `${req.protocol}://${req.get("host")}`,
      returnPath: buildSessionExpiredPath(getRedirectType(provenance), res.locals.locale)
    });

    req.logout(() => {
      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        res.clearCookie("connect.sid");
        res.redirect(redirectUrl);
      });
    });
    return;
  }

  updateLastActivity(req.session);
  res.locals.sessionIdleMs = getSessionIdleMs(role);
  res.locals.sessionWarningMs = SESSION_WARNING_LEAD_MS;
  res.locals.sessionRedirectType = getRedirectType(provenance);

  next();
}
