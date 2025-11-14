import config from "config";

export interface CftIdamConfig {
  cftIdamUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
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

export function getCftIdamConfig(): CftIdamConfig {
  const cftIdamUrl = getConfigValue("CFT_IDAM_URL");
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/cft-login/return`;

  return {
    cftIdamUrl,
    clientId: "app-pip-frontend",
    clientSecret: getConfigValue("CFT_IDAM_CLIENT_SECRET"),
    redirectUri,
    authorizationEndpoint: cftIdamUrl,
    tokenEndpoint: `${cftIdamUrl}/o/token`
  };
}

export function isCftIdamConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_CFT_IDAM) {
    return false;
  }

  const cftIdamConfig = getCftIdamConfig();
  return !!(cftIdamConfig.cftIdamUrl && cftIdamConfig.clientSecret);
}
