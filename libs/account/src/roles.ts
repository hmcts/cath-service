// TEMPORARY — reverted in the next commit. Touches a path that
// detect-code-changes matches, so the Build stage runs and the Sonar
// step is exercised on this pull request.
export const USER_ROLES = {
  VERIFIED: "VERIFIED",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
