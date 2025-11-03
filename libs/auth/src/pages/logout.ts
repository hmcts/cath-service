import type { Request, Response } from "express";
import { getSsoConfig } from "../sso-config.js";

/**
 * Extracts tenant ID from Azure AD identity metadata URL
 */
function extractTenantId(identityMetadata: string): string | null {
  const match = identityMetadata.match(/\/([a-f0-9-]+)\/v2\.0\//);
  return match ? match[1] : null;
}

/**
 * Handles user logout
 * Destroys session and redirects to Azure AD logout endpoint
 */
export const GET = async (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
    }

    req.session.destroy((destroyErr: Error | null) => {
      if (destroyErr) {
        console.error("Error destroying session:", destroyErr);
      }

      // Clear session cookie
      res.clearCookie("connect.sid");

      // Construct Azure AD logout URL
      const ssoConfig = getSsoConfig();
      const tenantId = extractTenantId(ssoConfig.identityMetadata);

      if (tenantId) {
        // Get the base URL for post-logout redirect
        const protocol = req.protocol;
        const host = req.get("host");
        const postLogoutRedirectUri = `${protocol}://${host}/`;

        // Redirect to Azure AD logout endpoint
        const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
        res.redirect(logoutUrl);
      } else {
        console.error("Could not extract tenant ID from identity metadata");
        res.redirect("/");
      }
    });
  });
};
