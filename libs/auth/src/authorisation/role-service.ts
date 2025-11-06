import { getSsoConfig } from "../config/sso-config.js";
import { USER_ROLES } from "../user/roles.js";

/**
 * Determines the user's role based on their Azure AD group memberships
 * Implements highest privilege logic: SYSTEM_ADMIN > INTERNAL_ADMIN
 * @param groupIds - Array of Azure AD group IDs the user belongs to
 * @returns The user's primary role or undefined if no role found
 */
export function determineUserRole(groupIds?: string[]): string | undefined {
  if (!groupIds || groupIds.length === 0) {
    return undefined;
  }

  const ssoConfig = getSsoConfig();

  // Check for SYSTEM_ADMIN first (highest privilege)
  if (groupIds.includes(ssoConfig.systemAdminGroupId)) {
    return USER_ROLES.SYSTEM_ADMIN;
  }

  // Check for INTERNAL_ADMIN_CTSC
  if (groupIds.includes(ssoConfig.internalAdminCtscGroupId)) {
    return USER_ROLES.INTERNAL_ADMIN_CTSC;
  }

  // Check for INTERNAL_ADMIN_LOCAL
  if (groupIds.includes(ssoConfig.internalAdminLocalGroupId)) {
    return USER_ROLES.INTERNAL_ADMIN_LOCAL;
  }

  return undefined;
}

/**
 * Checks if a user has one of the allowed roles
 * @param userRole - The user's assigned role
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has an allowed role, false otherwise
 */
export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) {
    return false;
  }
  return allowedRoles.includes(userRole);
}
