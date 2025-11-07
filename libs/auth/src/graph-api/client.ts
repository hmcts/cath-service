import { Client } from "@microsoft/microsoft-graph-client";
import type { UserProfile } from "../user-profile.js";

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
