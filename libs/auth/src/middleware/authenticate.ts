import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isSsoConfigured } from "../config/sso-config.js";

/**
 * Middleware to require authentication for protected routes
 * Redirects unauthenticated users to the appropriate login page
 * - Admin pages redirect to SSO login when configured
 * - Other pages redirect to account selection page
 * Saves the original requested URL for redirect after login
 */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }

    // Save the original URL to redirect after login
    req.session.returnTo = req.originalUrl;

    // Admin/internal pages should go directly to SSO when configured
    const isAdminPage = req.originalUrl.startsWith("/admin-dashboard") || req.originalUrl.startsWith("/system-admin-dashboard");

    if (isAdminPage && isSsoConfigured()) {
      // Redirect directly to SSO login for admin pages
      return res.redirect("/login");
    }

    // Redirect to sign-in page (account selection) for other pages
    res.redirect("/sign-in");
  };
}
