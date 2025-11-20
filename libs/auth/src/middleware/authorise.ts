import { USER_ROLES } from "@hmcts/account";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isSsoConfigured } from "../config/sso-config.js";
import { hasRole } from "../role-service/index.js";

/**
 * Middleware to require specific roles for protected routes
 * Redirects unauthorized users to their appropriate dashboard or login page
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export function requireRole(allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // First check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      req.session.returnTo = req.originalUrl;

      // Admin/internal pages should go directly to SSO when configured
      const isAdminPage = req.originalUrl.startsWith("/admin-dashboard") || req.originalUrl.startsWith("/system-admin-dashboard");

      if (isAdminPage && isSsoConfigured()) {
        // Redirect directly to SSO login for admin pages
        return res.redirect("/login");
      }

      // Redirect to sign-in page (account selection) for other pages
      return res.redirect("/sign-in");
    }

    const userRole = req.user.role;

    // Check if user has required role
    if (hasRole(userRole, allowedRoles)) {
      return next();
    }

    // User doesn't have required role - redirect to their allowed dashboard
    if (userRole === USER_ROLES.SYSTEM_ADMIN) {
      return res.redirect("/system-admin-dashboard");
    }

    if (userRole === USER_ROLES.INTERNAL_ADMIN_CTSC || userRole === USER_ROLES.INTERNAL_ADMIN_LOCAL) {
      return res.redirect("/admin-dashboard");
    }

    // User has no role - redirect to sign-in
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  };
}

/**
 * Middleware to block SSO users from accessing certain pages
 * SSO admin users (System Admin, Local Admin, CTSC Admin) are redirected to admin-dashboard
 * CFT IDAM users are allowed to proceed
 * @returns Express middleware function
 */
export function blockUserAccess(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Allow unauthenticated users (will be handled by other middleware)
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    // Check if user authenticated via SSO
    if (req.user.provenance === "SSO") {
      // Redirect all SSO admin users to admin-dashboard
      const userRole = req.user.role;
      if (userRole === USER_ROLES.SYSTEM_ADMIN || userRole === USER_ROLES.INTERNAL_ADMIN_CTSC || userRole === USER_ROLES.INTERNAL_ADMIN_LOCAL) {
        return res.redirect("/admin-dashboard");
      }
    }

    // Allow CFT IDAM users and others to proceed
    return next();
  };
}
