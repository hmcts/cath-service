import type { Request, Response } from "express";
import passport from "passport";
import { USER_ROLES } from "../../authorisation/role-service.js";
import { isSsoConfigured } from "../../config/sso-config.js";

/**
 * Handles OAuth callback from Azure AD
 * After successful authentication, redirects to the original requested URL or appropriate dashboard based on user role
 */
export const GET = [
  (req: Request, res: Response, next: () => void) => {
    // Check if SSO is properly configured
    if (!isSsoConfigured()) {
      console.warn("SSO callback attempted but SSO is not configured");
      return res.status(503).send("SSO authentication is not available. Please check configuration.");
    }

    // Proceed with SSO authentication
    return passport.authenticate("azuread-openidconnect", {
      failureRedirect: "/auth/login",
      failureMessage: true
    })(req, res, next);
  },
  async (req: Request, res: Response) => {
    if (!req.user) {
      return res.redirect("/auth/login");
    }

    // Check if user has a valid role
    if (!req.user.role) {
      return res.redirect("/sso/rejected");
    }

    // Determine default redirect based on user role
    let defaultRedirect = "/admin-dashboard";
    if (req.user.role === USER_ROLES.SYSTEM_ADMIN) {
      defaultRedirect = "/system-admin-dashboard";
    } else if (req.user.role === USER_ROLES.INTERNAL_ADMIN_CTSC || req.user.role === USER_ROLES.INTERNAL_ADMIN_LOCAL) {
      defaultRedirect = "/admin-dashboard";
    }

    // Get the return URL from session, or use role-based default
    const returnTo = req.session.returnTo || defaultRedirect;

    // Clear the returnTo from session
    delete req.session.returnTo;

    // Store user reference before regeneration
    const user = req.user;

    // Regenerate session for security
    req.session.regenerate((err: Error | null) => {
      if (err) {
        return res.redirect("/auth/login");
      }

      // Use req.login() to properly establish Passport session
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          return res.redirect("/auth/login");
        }

        // Save session before redirecting to prevent race condition
        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            return res.redirect("/auth/login");
          }

          res.redirect(returnTo);
        });
      });
    });
  }
];
