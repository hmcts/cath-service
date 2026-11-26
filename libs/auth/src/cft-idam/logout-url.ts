import type { CftIdamConfig } from "../config/cft-idam-config.js";

export function buildCftIdamLogoutUrl(redirectPath: string, config: CftIdamConfig, idToken: string | undefined): string {
  const params = new URLSearchParams({ post_logout_redirect_uri: `${config.baseUrl}${redirectPath}` });
  // IDAM only follows post_logout_redirect_uri when it can validate it against an id_token_hint
  if (idToken) {
    params.set("id_token_hint", idToken);
  }
  return `${config.endSessionEndpoint}?${params.toString()}`;
}
