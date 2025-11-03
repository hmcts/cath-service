import config from "config";

interface SsoConfig {
  identityMetadata: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowHttpForRedirectUrl: boolean;
  responseType: "code" | "code id_token" | "id_token code" | "id_token";
  responseMode: "query" | "form_post";
  scope: string[];
  systemAdminGroupId: string;
  internalAdminCtscGroupId: string;
  internalAdminLocalGroupId: string;
}

/**
 * Gets configuration value from config object or environment variable
 * Prioritizes process.env for local development, falls back to config for deployed environments
 */
function getConfigValue(key: string): string {
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  try {
    return config.get<string>(key);
  } catch {
    return "";
  }
}

/**
 * Loads SSO configuration from config object or environment variables
 * @returns SSO configuration object
 */
export function getSsoConfig(): SsoConfig {
  const baseUrl = getConfigValue("BASE_URL");
  const redirectUri = baseUrl ? `${baseUrl}/sso/return` : "";

  return {
    identityMetadata: getConfigValue("SSO_IDENTITY_METADATA"),
    clientId: getConfigValue("SSO_CLIENT_ID"),
    clientSecret: getConfigValue("SSO_CLIENT_SECRET"),
    redirectUri,
    allowHttpForRedirectUrl: getConfigValue("SSO_ALLOW_HTTP_REDIRECT") === "true",
    responseType: "code",
    responseMode: "query",
    scope: ["openid", "profile", "email"],
    systemAdminGroupId: getConfigValue("SSO_SYSTEM_ADMIN_GROUP_ID"),
    internalAdminCtscGroupId: getConfigValue("SSO_INTERNAL_ADMIN_CTSC_GROUP_ID"),
    internalAdminLocalGroupId: getConfigValue("SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID")
  };
}
