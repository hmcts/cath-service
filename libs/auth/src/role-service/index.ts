import { USER_ROLES } from "@hmcts/account";
import { getSsoConfig } from "../config/sso-config.js";

/**
 * Determines the user's role based on their Azure AD SSO group memberships
 * Implements highest privilege logic: SYSTEM_ADMIN > INTERNAL_ADMIN
 * @param groupIds - Array of Azure AD group IDs the user belongs to
 * @returns The user's primary role or undefined if no role found
 */
export function determineSsoUserRole(groupIds?: string[]): string | undefined {
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

const REJECTED_ROLE_PATTERN = /^citizen(-.*)?$|^letter-holder$/;

/**
 * Checks if any of the provided roles match the rejected role pattern
 * Rejected roles include: citizen, citizen-*, letter-holder
 * @param roles - Array of role strings to check
 * @returns true if any role matches the rejected pattern, false otherwise
 */
export function isRejectedCFTRole(roles: string[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some((role) => REJECTED_ROLE_PATTERN.test(role));
}
