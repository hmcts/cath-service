import type { NextFunction, Request, RequestHandler, Response } from "express";
import { hasRole, USER_ROLES } from "./role-service.js";

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
      return res.redirect("/auth/login");
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

    // User has no role - redirect to login
    req.session.returnTo = req.originalUrl;
    return res.redirect("/auth/login");
  };
}
