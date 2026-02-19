import type { Request, Response } from "express";
import { getSsoConfig } from "../../config/sso-config.js";

function extractTenantId(issuerUrl: string): string | null {
  const match = issuerUrl.match(/\/([a-f0-9-]+)\/v2\.0/);
  return match ? match[1] : null;
}

/**
 * Handles user logout
 * Destroys session and redirects to session-logged-out page
 * - CFT IDAM users: Direct redirect to session-logged-out page
 * - SSO users: Redirects to Azure AD logout, then to session-logged-out page
 */
export const GET = async (req: Request, res: Response) => {
  const userProvenance = req.user?.provenance;

  req.logout(() => {
    req.session.destroy(() => {
      // Clear session cookie
      res.clearCookie("connect.sid");

      // Check if user logged in via CFT IDAM
      if (userProvenance === "CFT_IDAM") {
        return res.redirect("/session-logged-out");
      }

      // SSO logout flow: Construct Azure AD logout URL
      const ssoConfig = getSsoConfig();
      const tenantId = extractTenantId(ssoConfig.issuerUrl);

      if (tenantId) {
        // Get the base URL for post-logout redirect
        const protocol = req.protocol;
        const host = req.get("host");
        const postLogoutRedirectUri = `${protocol}://${host}/session-logged-out`;

        // Redirect to Azure AD logout endpoint
        const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
        res.redirect(logoutUrl);
      } else {
        res.redirect("/session-logged-out");
      }
    });
  });
};
