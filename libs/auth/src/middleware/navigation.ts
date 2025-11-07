import type { NextFunction, Request, Response } from "express";
import { buildNavigationItems } from "./navigation-helper.js";

/**
 * Middleware to set navigation state based on authentication status
 * Sets res.locals.isAuthenticated and res.locals.navigation for global navigation
 * Navigation items are role-based and appear on all pages for authenticated users
 */
export function authNavigationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.isAuthenticated = req.isAuthenticated();

    // Initialize navigation object if it doesn't exist
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }

    // Add role-based navigation items for authenticated users with SSO role
    if (req.isAuthenticated() && req.user?.role) {
      res.locals.navigation.verifiedItems = buildNavigationItems(req.user.role, req.path);
    } else {
      // Clear navigation items when user is not authenticated or has no role
      res.locals.navigation.verifiedItems = undefined;
    }

    next();
  };
}
