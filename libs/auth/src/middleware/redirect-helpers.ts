import type { Request, Response } from "express";
import { isSsoConfigured } from "../config/sso-config.js";

/**
 * Redirects unauthenticated users to the appropriate login page
 * - Admin pages redirect to SSO login when configured
 * - Other pages redirect to account selection page
 * Saves the original requested URL for redirect after login
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export function redirectUnauthenticated(req: Request, res: Response): void {
  // Save the original URL to redirect after login
  req.session.returnTo = req.originalUrl;

  // Admin/internal pages should go directly to SSO when configured
  const isAdminPage =
    req.originalUrl.startsWith("/admin-dashboard") ||
    req.originalUrl.startsWith("/system-admin-dashboard");

  if (isAdminPage && isSsoConfigured()) {
    // Redirect directly to SSO login for admin pages
    res.redirect("/login");
    return;
  }

  // Redirect to sign-in page (account selection) for other pages
  res.redirect("/sign-in");
}
