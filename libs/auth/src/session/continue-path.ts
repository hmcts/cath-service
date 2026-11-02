import { USER_ROLES } from "@hmcts/account";

const MAX_PATH_LENGTH = 2048;
const PLACEHOLDER_ORIGIN = "http://cath.invalid";
const BLOCKED_PATH_PATTERN = /^\/(session-expir|logout(\/|$))/i;

export function resolveContinuePath(raw: unknown, role: string | undefined): string {
  return validateRelativePath(raw) ?? getLandingPage(role);
}

function validateRelativePath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_PATH_LENGTH) {
    return null;
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }

  if (parsed.origin !== PLACEHOLDER_ORIGIN || parsed.pathname.startsWith("//")) {
    return null;
  }

  if (BLOCKED_PATH_PATTERN.test(parsed.pathname)) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}`;
}

function getLandingPage(role: string | undefined): string {
  if (role === USER_ROLES.SYSTEM_ADMIN) {
    return "/system-admin-dashboard";
  }

  if (role === USER_ROLES.INTERNAL_ADMIN_CTSC || role === USER_ROLES.INTERNAL_ADMIN_LOCAL) {
    return "/admin-dashboard";
  }

  return "/account-home";
}
