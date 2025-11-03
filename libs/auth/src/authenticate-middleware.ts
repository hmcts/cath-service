import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Middleware to require authentication for protected routes
 * Redirects unauthenticated users to the login page
 * Saves the original requested URL for redirect after login
 */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }

    // Save the original URL to redirect after login
    req.session.returnTo = req.originalUrl;

    // Redirect to login page
    res.redirect("/auth/login");
  };
}
