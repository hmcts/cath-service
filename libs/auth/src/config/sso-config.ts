import config from "config";

interface SsoConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  systemAdminGroupId: string;
  internalAdminCtscGroupId: string;
  internalAdminLocalGroupId: string;
}

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

export function getSsoConfig(): SsoConfig {
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/sso/return`;

  return {
    issuerUrl: getConfigValue("SSO_ISSUER_URL"),
    clientId: getConfigValue("SSO_CLIENT_ID"),
    clientSecret: getConfigValue("SSO_CLIENT_SECRET"),
    redirectUri,
    scope: ["openid", "profile", "email"],
    systemAdminGroupId: getConfigValue("SSO_SYSTEM_ADMIN_GROUP_ID"),
    internalAdminCtscGroupId: getConfigValue("SSO_INTERNAL_ADMIN_CTSC_GROUP_ID"),
    internalAdminLocalGroupId: getConfigValue("SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID")
  };
}

export function isSsoConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_SSO) {
    return false;
  }

  const ssoConfig = getSsoConfig();
  return !!(ssoConfig.issuerUrl && ssoConfig.clientId && ssoConfig.clientSecret);
}
