import config from "config";

interface B2cConfig {
  tenantName: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  policyCath: string;
  policyPasswordReset: string;
  redirectUri: string;
  responseType: "code" | "code id_token" | "id_token code" | "id_token";
  responseMode: "query" | "form_post";
  scope: string[];
  customDomain: string;
  customDomainPath: string;
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
 * Loads B2C configuration from config object or environment variables
 * @returns B2C configuration object
 */
export function getB2cConfig(): B2cConfig {
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/login/return`;

  return {
    tenantName: getConfigValue("B2C_TENANT_NAME"),
    tenantId: getConfigValue("B2C_TENANT_ID"),
    clientId: getConfigValue("B2C_CLIENT_ID"),
    clientSecret: getConfigValue("B2C_CLIENT_SECRET"),
    policyCath: getConfigValue("B2C_POLICY_CATH") || "B2C_1_SignInUserFlow",
    policyPasswordReset: getConfigValue("B2C_POLICY_PASSWORD_RESET") || "B2C_1A_PASSWORD_RESET",
    redirectUri,
    responseType: "code",
    responseMode: "query",
    scope: ["openid"],
    customDomain: getConfigValue("B2C_CUSTOM_DOMAIN") || "",
    customDomainPath: getConfigValue("B2C_CUSTOM_DOMAIN_PATH") || ""
  };
}

/**
 * Checks if B2C is fully configured and available
 * @returns true if B2C configuration is complete, false otherwise
 */
export function isB2cConfigured(): boolean {
  // Check if B2C should be disabled for local development
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_B2C) {
    return false;
  }

  const b2cConfig = getB2cConfig();
  return !!(b2cConfig.clientId && b2cConfig.clientSecret);
}

/**
 * Gets the B2C base URL for authorization/token endpoints
 * Uses custom domain if configured, otherwise falls back to b2clogin.com
 */
export function getB2cBaseUrl(): string {
  const b2cConfig = getB2cConfig();

  if (b2cConfig.customDomain && b2cConfig.customDomainPath) {
    return `https://${b2cConfig.customDomain}/${b2cConfig.customDomainPath}`;
  }

  return `https://${b2cConfig.tenantName}.b2clogin.com/${b2cConfig.tenantName}.onmicrosoft.com`;
}

/**
 * Gets the B2C authority URL for the CaTH policy
 * Note: HMCTS uses CFT IDAM, not B2C. B2C is only for CaTH users.
 * @returns The full authority URL
 */
export function getB2cAuthorityUrl(): string {
  const b2cConfig = getB2cConfig();
  return `${getB2cBaseUrl()}/${b2cConfig.policyCath}`;
}
