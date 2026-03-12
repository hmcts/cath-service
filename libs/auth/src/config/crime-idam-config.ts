import config from "config";

export interface CrimeIdamConfig {
  crimeIdamUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
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

export function getCrimeIdamConfig(): CrimeIdamConfig {
  const crimeIdamUrl = getConfigValue("CRIME_IDAM_BASE_URL");
  const baseUrl = getConfigValue("BASE_URL") || "https://localhost:8080";
  const redirectUri = `${baseUrl}/crime-login/return`;
  const scope = getConfigValue("CRIME_IDAM_SCOPE") || "openid profile roles";

  return {
    crimeIdamUrl,
    clientId: getConfigValue("CRIME_IDAM_CLIENT_ID"),
    clientSecret: getConfigValue("CRIME_IDAM_CLIENT_SECRET"),
    redirectUri,
    scope,
    authorizationEndpoint: `${crimeIdamUrl}/idp/oauth2/authorize`,
    tokenEndpoint: `${crimeIdamUrl}/idp/oauth2/access_token`
  };
}

export function isCrimeIdamConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_CRIME_IDAM) {
    return false;
  }

  const crimeIdamConfig = getCrimeIdamConfig();
  return !!(crimeIdamConfig.crimeIdamUrl && crimeIdamConfig.clientId && crimeIdamConfig.clientSecret);
}
