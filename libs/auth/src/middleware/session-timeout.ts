import type { NextFunction, Request, Response } from "express";
import { buildSignOutRedirectUrl } from "../session/sign-out-redirect.js";
import { getSessionTimeoutMs, isSessionExpired, SESSION_WARNING_LEAD_MS, updateLastActivity } from "../session/timeout-tracker.js";

/**
 * Enforces the role-based inactivity timeout on every signed-in request, as legacy pip-frontend's
 * globalAuthGiver does. An expired session is signed out the same way as /logout and lands on
 * /session-logged-out. The browser warning page only covers the client-side path.
 */
export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    next();
    return;
  }

  const role = req.user?.role;

  if (isSessionExpired(req.session, role)) {
    const redirectUrl = buildSignOutRedirectUrl({
      provenance: req.user?.provenance,
      locale: res.locals.locale,
      origin: `${req.protocol}://${req.get("host")}`
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
  res.locals.sessionIdleMs = getSessionTimeoutMs(role) - SESSION_WARNING_LEAD_MS;

  next();
}
