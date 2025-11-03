import { Client } from "@microsoft/microsoft-graph-client";
import type { UserProfile } from "./types.js";

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

    console.log("[Graph API] /me/memberOf response:", JSON.stringify(memberOf, null, 2));

    // Extract roles and group IDs from memberOf response
    const roles: string[] = [];
    const groupIds: string[] = [];
    if (memberOf && memberOf.value && Array.isArray(memberOf.value)) {
      console.log(`[Graph API] Found ${memberOf.value.length} group memberships`);
      for (const group of memberOf.value) {
        if (group.id) {
          groupIds.push(group.id);
          console.log(`[Graph API] Group ID: ${group.id}, Display Name: ${group.displayName || "N/A"}`);
        }
        if (group.displayName) {
          roles.push(group.displayName);
        }
      }
    } else {
      console.log("[Graph API] No group memberships found or invalid response structure");
    }

    console.log("[Graph API] Extracted group IDs:", groupIds);
    console.log("[Graph API] Extracted role names:", roles);

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
    console.error("Error fetching user profile from Microsoft Graph:", graphError.message || graphError);
    throw new Error(`Failed to fetch user profile: ${graphError.message || "Unknown error"}`);
  }
}
