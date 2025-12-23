/**
 * Helper utilities for API authentication in E2E tests
 * Generates OAuth tokens using Azure AD client credentials flow
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Get a valid OAuth token for API testing
 * Uses client credentials flow with Azure AD
 * Token is cached and reused until it expires
 */
export async function getApiAuthToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_API_CLIENT_ID;
  const clientSecret = process.env.AZURE_API_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Azure AD credentials. Ensure AZURE_TENANT_ID, AZURE_API_CLIENT_ID, and AZURE_API_CLIENT_SECRET are set. " +
        "Run tests with: node run-with-credentials.js"
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: `${clientId}/.default`,
    grant_type: "client_credentials"
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to get OAuth token: ${response.status} ${response.statusText}\n${errorBody}`);
    }

    const tokenData: TokenResponse = await response.json();

    cachedToken = tokenData.access_token;
    tokenExpiry = Date.now() + tokenData.expires_in * 1000;

    return cachedToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OAuth token generation failed: ${message}`);
  }
}

/**
 * Clear the cached token (useful for testing token expiry scenarios)
 */
export function clearCachedToken(): void {
  cachedToken = null;
  tokenExpiry = null;
}
