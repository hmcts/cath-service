import type { NextFunction, Request, Response } from "express";
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
    // Destroy session
    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect("/session-expired");
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
