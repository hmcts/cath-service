import type { Request, Response } from "express";
import { getB2cBaseUrl, getB2cConfig } from "../../config/b2c-config.js";
import { getSsoConfig } from "../../config/sso-config.js";

function extractTenantId(issuerUrl: string): string | null {
  const match = issuerUrl.match(/\/([a-f0-9-]+)\/v2\.0/);
  return match ? match[1] : null;
}

/**
 * Builds the post-logout redirect URI
 */
function getPostLogoutRedirectUri(req: Request): string {
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/session-logged-out`;
}

/**
 * Handles user logout
 * Destroys session and redirects to session-logged-out page
 * - CFT IDAM users: Direct redirect to session-logged-out page
 * - B2C users: Redirects to B2C logout, then to session-logged-out page
 * - SSO users: Redirects to Azure AD logout, then to session-logged-out page
 */
export const GET = async (req: Request, res: Response) => {
  const userProvenance = req.user?.provenance;

  req.logout(() => {
    req.session.destroy(() => {
      // Clear session cookie
      res.clearCookie("connect.sid");

      // CFT IDAM logout - direct redirect
      if (userProvenance === "CFT_IDAM") {
        return res.redirect("/session-logged-out");
      }

      // B2C logout flow
      if (userProvenance === "B2C") {
        const b2cConfig = getB2cConfig();
        const b2cBaseUrl = getB2cBaseUrl();
        const postLogoutRedirectUri = getPostLogoutRedirectUri(req);

        const logoutUrl = new URL(`${b2cBaseUrl}/oauth2/v2.0/logout`);
        logoutUrl.searchParams.set("p", b2cConfig.policyCath);
        logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

        return res.redirect(logoutUrl.toString());
      }

      // SSO logout flow: Construct Azure AD logout URL
      const ssoConfig = getSsoConfig();
      const tenantId = extractTenantId(ssoConfig.issuerUrl);

      if (tenantId) {
        const postLogoutRedirectUri = getPostLogoutRedirectUri(req);
        const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
        return res.redirect(logoutUrl);
      }

      res.redirect("/session-logged-out");
    });
  });
};
