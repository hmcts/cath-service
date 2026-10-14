import type { CftIdamConfig } from "../config/cft-idam-config.js";

export function buildCftIdamLogoutUrl(redirectPath: string, config: CftIdamConfig): string {
  const postLogoutRedirectUri = encodeURIComponent(`${config.baseUrl}${redirectPath}`);
  return `${config.endSessionEndpoint}?post_logout_redirect_uri=${postLogoutRedirectUri}`;
}
