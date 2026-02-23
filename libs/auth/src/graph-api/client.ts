import crypto from "node:crypto";
import { Client } from "@microsoft/microsoft-graph-client";
import type { UserProfile } from "../user-profile.js";

const GRAPH_API_SCOPE = "https://graph.microsoft.com/.default";

interface GraphUser {
  id: string;
  mail?: string;
  userPrincipalName: string;
  displayName: string;
}

interface GraphError {
  statusCode?: number;
  code?: string;
  message?: string;
}

/**
 * Fetches user profile and roles from Microsoft Graph API
 * @param accessToken - OAuth access token
 * @returns User profile with roles
 */
export async function fetchUserProfile(accessToken: string): Promise<UserProfile> {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  try {
    // Fetch user profile from /me endpoint
    const user = (await client.api("/me").get()) as GraphUser;

    // Fetch user's group memberships (app roles)
    const memberOf = await client.api("/me/memberOf").get();

    // Extract roles and group IDs from memberOf response
    const roles: string[] = [];
    const groupIds: string[] = [];
    if (memberOf?.value && Array.isArray(memberOf.value)) {
      for (const group of memberOf.value) {
        if (group.id) {
          groupIds.push(group.id);
        }
        if (group.displayName) {
          roles.push(group.displayName);
        }
      }
    }

    return {
      id: user.id,
      email: user.mail || user.userPrincipalName,
      displayName: user.displayName,
      roles,
      groupIds,
      accessToken
    };
  } catch (error) {
    const graphError = error as GraphError;
    throw new Error(`Failed to fetch user profile: ${graphError.message || "Unknown error"}`);
  }
}

/**
 * Obtains an access token using OAuth2 client credentials flow.
 * Requires AZURE_B2C_TENANT_ID, AZURE_B2C_CLIENT_ID, AZURE_B2C_CLIENT_SECRET env vars.
 */
export async function getGraphApiAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_B2C_TENANT_ID;
  const clientId = process.env.AZURE_B2C_CLIENT_ID;
  const clientSecret = process.env.AZURE_B2C_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure B2C credentials not configured: AZURE_B2C_TENANT_ID, AZURE_B2C_CLIENT_ID, AZURE_B2C_CLIENT_SECRET are required");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: GRAPH_API_SCOPE
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to obtain Graph API access token: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Checks if a user exists in Azure AD B2C by email address.
 */
export async function checkUserExists(accessToken: string, email: string): Promise<boolean> {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  try {
    const sanitisedEmail = email.replace(/'/g, "''");
    const result = await client.api("/users").filter(`mail eq '${sanitisedEmail}'`).select("id").get();

    return result?.value?.length > 0;
  } catch (error) {
    const graphError = error as GraphError;
    console.error("Graph API checkUserExists error:", { statusCode: graphError.statusCode, code: graphError.code, message: graphError.message });
    throw new Error(`Failed to check user existence: ${graphError.message || "Unknown error"}`);
  }
}

/**
 * Creates a new media user in Azure AD B2C.
 * Sets displayName, givenName, surname. Does NOT store employer.
 * Forces password change on first login.
 */
export async function createMediaUser(
  accessToken: string,
  userData: {
    email: string;
    displayName: string;
    givenName: string;
    surname: string;
  }
): Promise<{ azureAdUserId: string }> {
  const b2cDomain = process.env.AZURE_B2C_DOMAIN;
  if (!b2cDomain) {
    throw new Error("Azure B2C domain not configured: AZURE_B2C_DOMAIN is required");
  }

  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  const randomPassword = crypto.randomBytes(32).toString("base64");

  try {
    const createdUser = await client.api("/users").post({
      accountEnabled: true,
      displayName: userData.displayName,
      givenName: userData.givenName,
      surname: userData.surname,
      mail: userData.email,
      mailNickname: userData.email.split("@")[0],
      userPrincipalName: `${crypto.randomUUID()}@${b2cDomain}`,
      identities: [
        {
          signInType: "emailAddress",
          issuer: b2cDomain,
          issuerAssignedId: userData.email
        }
      ],
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: randomPassword
      }
    });

    return { azureAdUserId: createdUser.id };
  } catch (error) {
    const graphError = error as GraphError;
    console.error("Graph API createMediaUser error:", { statusCode: graphError.statusCode, code: graphError.code, message: graphError.message });
    throw new Error(`Failed to create media user in Azure AD: ${graphError.message || "Unknown error"}`);
  }
}
