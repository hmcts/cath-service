import { getB2cBaseUrl, getB2cConfig } from "../config/b2c-config.js";

export function buildB2cLogoutUrl(postLogoutRedirectUri: string): string {
  const logoutUrl = new URL(`${getB2cBaseUrl()}/oauth2/v2.0/logout`);
  logoutUrl.searchParams.set("p", getB2cConfig().policyCath);
  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  return logoutUrl.toString();
}
