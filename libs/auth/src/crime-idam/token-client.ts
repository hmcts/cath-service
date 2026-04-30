import type { CrimeIdamConfig } from "../config/crime-idam-config.js";

interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  [key: string]: any;
}

export interface CrimeIdamUserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  surname?: string;
  roles: string[];
}

export async function exchangeCodeForToken(code: string, config: CrimeIdamConfig): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      throw new Error("Invalid JWT format");
    }
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    throw new Error(`Failed to parse JWT: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function extractUserInfoFromToken(tokenResponse: TokenResponse): CrimeIdamUserInfo {
  const idToken = tokenResponse.id_token || tokenResponse.access_token;
  if (!idToken) {
    throw new Error("No id_token or access_token found in response");
  }

  const claims = parseJwt(idToken);

  const roles: string[] = [];
  if (claims.roles && Array.isArray(claims.roles)) {
    roles.push(...claims.roles);
  }

  return {
    id: claims.uid || claims.sub,
    email: claims.email || claims.sub || "",
    displayName: claims.name || claims.given_name || claims.email || "",
    firstName: claims.given_name,
    surname: claims.family_name,
    roles
  };
}
