import { buildB2cLogoutUrl } from "../b2c/logout-url.js";
import { buildCftIdamLogoutUrl } from "../cft-idam/logout-url.js";
import { getCftIdamConfig } from "../config/cft-idam-config.js";
import { getSsoConfig } from "../config/sso-config.js";

const SESSION_LOGGED_OUT_PATH = "/session-logged-out";

export function buildSignOutRedirectUrl({ provenance, locale, origin }: SignOutRedirectOptions): string {
  // The strict locale cookie is not sent on the cross-site return from B2C or Microsoft, so the language must travel in the URL
  const lng = locale === "cy" ? "cy" : "en";
  const loggedOutPath = `${SESSION_LOGGED_OUT_PATH}?lng=${lng}`;

  if (provenance === "CFT_IDAM") {
    return buildCftIdamLogoutUrl(loggedOutPath, getCftIdamConfig());
  }

  if (provenance === "CRIME_IDAM") {
    return loggedOutPath;
  }

  const postLogoutRedirectUri = `${origin}${loggedOutPath}`;

  if (provenance === "PI_AAD") {
    return buildB2cLogoutUrl(postLogoutRedirectUri);
  }

  const tenantId = extractTenantId(getSsoConfig().issuerUrl);
  if (!tenantId) {
    return loggedOutPath;
  }

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
}

function extractTenantId(issuerUrl: string): string | null {
  const match = issuerUrl.match(/\/([a-f0-9-]+)\/v2\.0(?:\/|$)/);
  return match ? match[1] : null;
}

interface SignOutRedirectOptions {
  provenance: string | undefined;
  locale: string | undefined;
  origin: string;
}
