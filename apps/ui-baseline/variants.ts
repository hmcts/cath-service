import type { ParityUser } from "./fixtures/manifest.js";

// The variants of each page the baseline captures beyond its main capture: the same page as every
// other role its guard lets in (id "<page>@<fixture user>"), public pages and lists as a signed-in
// verified user too, and the main capture again at mobile width (state "mobile"). Both target
// builders and the check use these, so pip's and CaTH's captures pair up.

// pip-frontend's guards and the roles each admits (src/main/authentication/authenticationHelper.ts
// at the pinned commit)
const GUARD_ROLES: Record<string, string[]> = {
  isPermittedMedia: ["VERIFIED"],
  isPermittedSystemAdmin: ["SYSTEM_ADMIN"],
  isPermittedAdmin: ["SYSTEM_ADMIN", "INTERNAL_SUPER_ADMIN_CTSC", "INTERNAL_SUPER_ADMIN_LOCAL", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"],
  isPermittedManualUpload: ["SYSTEM_ADMIN", "INTERNAL_SUPER_ADMIN_CTSC", "INTERNAL_SUPER_ADMIN_LOCAL", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"],
  isPermittedMediaAccount: ["INTERNAL_SUPER_ADMIN_CTSC", "INTERNAL_ADMIN_CTSC"],
  isPermittedAnyRole: ["VERIFIED", "SYSTEM_ADMIN", "INTERNAL_SUPER_ADMIN_CTSC", "INTERNAL_SUPER_ADMIN_LOCAL", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"]
};
// Who public pages and lists are captured as when signed in: verified users see more of them
// (download links, classified lists)
export const SIGNED_IN_VIEWER = "verified-media";
const VARIANT_SEPARATOR = "@";
// What each app shows for an address it has no page for: the same address is asked of both
export const NOT_FOUND_PATH = "/ui-baseline-page-that-does-not-exist";
export const NOT_FOUND_ID = "page--not-found-address";

// The other fixture users a page behind this guard is captured as, besides captureAs
export function variantUsers(guard: string | null, captureAs: string | null, users: ParityUser[]): ParityUser[] {
  const roles = guard ? GUARD_ROLES[guard] : null;
  if (!roles) return [];
  return users.filter((user) => !user.journeysOnly && user.id !== captureAs && roles.includes(user.role));
}

export function variantId(id: string, userId: string): string {
  return `${id}${VARIANT_SEPARATOR}${userId}`;
}

// The page a capture id is of, and the fixture user it is a variant for (null for the main capture)
export function parseVariant(id: string): { base: string; viewAs: string | null } {
  const at = id.indexOf(VARIANT_SEPARATOR);
  return at < 0 ? { base: id, viewAs: null } : { base: id.slice(0, at), viewAs: id.slice(at + 1) };
}

// Each main capture again at mobile width; variants for other roles are desktop only
export function withMobile<T extends { id: string }>(targets: T[]): (T & { viewport?: "mobile" })[] {
  return [...targets, ...targets.filter((target) => !parseVariant(target.id).viewAs).map((target) => ({ ...target, viewport: "mobile" as const }))];
}
