import type { NextFunction, Request, Response } from "express";

/**
 * Middleware to set navigation state based on authentication status
 * Sets res.locals.isAuthenticated which templates can use to show/hide Sign in/Sign out
 */
export function authNavigationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
  };
}
