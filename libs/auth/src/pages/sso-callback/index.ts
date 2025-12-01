import { USER_ROLES } from "@hmcts/account";
import { createOrUpdateUser } from "@hmcts/account/repository/query";
import { trackException } from "@hmcts/cloud-native-platform";
import type { Request, Response } from "express";
import passport from "passport";
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
      failureRedirect: "/login",
      failureMessage: true
    })(req, res, next);
  },
  async (req: Request, res: Response) => {
    if (!req.user) {
      return res.redirect("/login");
    }

    // Check if user has a valid role
    if (!req.user.role) {
      return res.redirect("/sso-rejected");
    }

    // Create or update user record in database
    try {
      await createOrUpdateUser({
        email: req.user.email,
        userProvenance: "SSO",
        userProvenanceId: req.user.id,
        role: req.user.role as "VERIFIED" | "LOCAL_ADMIN" | "CTSC_ADMIN" | "SYSTEM_ADMIN"
      });
    } catch (error) {
      trackException(error as Error, {
        area: "SSO callback",
        userEmail: req.user?.email,
        userId: req.user?.id
      });
      return res.redirect("/login?error=db_error");
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
        return res.redirect("/login");
      }

      // Use req.login() to properly establish Passport session
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          return res.redirect("/login");
        }

        // Save session before redirecting to prevent race condition
        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            return res.redirect("/login");
          }

          res.redirect(returnTo);
        });
      });
    });
  }
];
