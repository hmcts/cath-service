import config from "config";

interface SsoConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/sso/return`;

  return {
    issuerUrl: getConfigValue("SSO_ISSUER_URL"),
    clientId: getConfigValue("SSO_CLIENT_ID"),
    clientSecret: getConfigValue("SSO_CLIENT_SECRET"),
    redirectUri,
    systemAdminGroupId: getConfigValue("SSO_SYSTEM_ADMIN_GROUP_ID"),
    internalAdminCtscGroupId: getConfigValue("SSO_INTERNAL_ADMIN_CTSC_GROUP_ID"),
    internalAdminLocalGroupId: getConfigValue("SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID")
  };
}

/**
 * Checks if SSO is fully configured and available
 * @returns true if SSO configuration is complete, false otherwise
 */
export function isSsoConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_SSO) {
    return false;
  }

  const ssoConfig = getSsoConfig();
  return !!(ssoConfig.issuerUrl && ssoConfig.clientId && ssoConfig.clientSecret);
}
