import type { NextFunction, Request, Response } from "express";

/**
 * Placeholder authentication middleware for system admin routes.
 * Currently allows all access for development purposes.
 *
 * TODO: Replace with actual SSO-based authentication when SSO integration is implemented.
 * Should verify:
 * - User is authenticated via SSO
 * - User has system admin role/privileges
 * - Redirect to sign-in page if not authenticated
 * - Show 403 error if authenticated but not admin
 */
export function requireSystemAdmin() {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // TODO: Implement actual authentication check
    // For now, allow all access for development
    next();
  };
}
