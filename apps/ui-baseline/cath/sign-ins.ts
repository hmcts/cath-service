import type { CathUser } from "./records.js";

// What the two ways of signing in to CaTH (session-sign-in.ts, account-sign-in.ts) share
export const LOCALES = ["en", "cy"];
// CaTH has no super admins; pip's map to the admin role with the same reach
export const CATH_ROLE: Record<string, string> = {
  VERIFIED: "VERIFIED",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  INTERNAL_SUPER_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_SUPER_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL",
  INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
};

export interface SignIns {
  users: Record<string, SignedInUser>;
  // The CaTH account behind each fixture user, which records belong to
  cathUsers: Record<string, CathUser>;
  // Fixture users that could not be signed in, with why
  unavailable: Record<string, string>;
}

export interface SignedInUser {
  userId: string;
  role: string;
  // The session's cookies, per language
  cookies: Record<string, { name: string; value: string }[]>;
}
