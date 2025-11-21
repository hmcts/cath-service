import type { NextFunction, Request, RequestHandler, Response } from "express";
import { redirectUnauthenticated } from "./redirect-helpers.js";

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

    redirectUnauthenticated(req, res);
  };
}
