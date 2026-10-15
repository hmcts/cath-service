import config from "config";

export interface CftIdamConfig {
  cftIdamUrl: string;
  hmctsAccessUrl: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint: string;
}

function getConfigValue(key: string): string {
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  try {
    return config.get<string>(key) ?? "";
  } catch {
    return "";
  }
}

export function getCftIdamConfig(): CftIdamConfig {
  const cftIdamUrl = getConfigValue("CFT_IDAM_URL");
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/cft-login/return`;
  const scope = getConfigValue("CFT_IDAM_SCOPE") || "openid profile roles";

  return {
    cftIdamUrl,
    hmctsAccessUrl: cftIdamUrl.replace("idam-web-public", "hmcts-access"),
    baseUrl,
    clientId: "app-pip-frontend",
    clientSecret: getConfigValue("CFT_IDAM_CLIENT_SECRET"),
    redirectUri,
    scope,
    authorizationEndpoint: `${cftIdamUrl}/o/authorize`,
    tokenEndpoint: `${cftIdamUrl}/o/token`,
    endSessionEndpoint: `${cftIdamUrl}/o/endSession`
  };
}

export function isCftIdamConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_CFT_IDAM) {
    return false;
  }

  const cftIdamConfig = getCftIdamConfig();
  return !!(cftIdamConfig.cftIdamUrl && cftIdamConfig.clientSecret);
}
