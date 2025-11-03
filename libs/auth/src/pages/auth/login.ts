import passport from "passport";

/**
 * Initiates Azure AD authentication flow
 * Redirects user to Microsoft login page
 */
export const GET = passport.authenticate("azuread-openidconnect", {
  failureRedirect: "/",
  failureMessage: true
});
