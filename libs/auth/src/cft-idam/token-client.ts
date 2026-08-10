import type { CftIdamConfig } from "../config/cft-idam-config.js";

const MAX_TOKEN_EXCHANGE_ATTEMPTS = 2;
const TOKEN_EXCHANGE_RETRY_DELAY_MS = 250;

interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  [key: string]: any;
}

export interface CftIdamUserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  surname?: string;
  roles: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function exchangeCodeForToken(code: string, config: CftIdamConfig): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code
  });
  const body = params.toString();

  for (let attempt = 1; attempt <= MAX_TOKEN_EXCHANGE_ATTEMPTS; attempt++) {
    const isLastAttempt = attempt === MAX_TOKEN_EXCHANGE_ATTEMPTS;
    let response: Response;
    try {
      response = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    } catch (error) {
      // Transient network failure (DNS, connection reset, timeout) reaching IDAM - safe to retry.
      if (isLastAttempt) throw error;
      await sleep(TOKEN_EXCHANGE_RETRY_DELAY_MS);
      continue;
    }

    if (response.ok) {
      return await response.json();
    }

    // 5xx responses from IDAM are transient; 4xx (e.g. an already-used authorization
    // code) will never succeed on retry, so fail fast for those.
    if (response.status < 500 || isLastAttempt) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    // Release the connection back to the pool before retrying - an unconsumed
    // response body keeps it open.
    await response.body?.cancel();
    await sleep(TOKEN_EXCHANGE_RETRY_DELAY_MS);
  }

  throw new Error("Token exchange failed: exhausted retries");
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

export function extractUserInfoFromToken(tokenResponse: TokenResponse): CftIdamUserInfo {
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
    id: claims.uid,
    email: claims.sub || claims.email || "",
    displayName: claims.name || claims.given_name,
    firstName: claims.given_name,
    surname: claims.family_name,
    roles
  };
}
