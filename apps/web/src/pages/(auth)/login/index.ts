import { isSsoConfigured } from "@hmcts/auth";
import type { Request, Response } from "express";
import passport from "passport";

/**
 * Initiates Azure AD authentication flow
 * Redirects user to Microsoft login page
 */
export const GET = (req: Request, res: Response, next: () => void) => {
  // Check if SSO is properly configured
  if (!isSsoConfigured()) {
    console.warn("SSO authentication attempted but SSO is not configured");
    return res.status(503).send("SSO authentication is not available. Please check configuration.");
  }

  // Proceed with SSO authentication
  return passport.authenticate("sso-oidc", {
    failureRedirect: "/",
    failureMessage: true
  })(req, res, next);
};
