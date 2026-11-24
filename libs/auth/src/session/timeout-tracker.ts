import { USER_ROLES } from "@hmcts/account";
import type { Session, SessionData } from "express-session";

const MINUTE_MS = 60 * 1000;
const SESSION_TIMEOUT_MS = 60 * MINUTE_MS;
const ADMIN_SESSION_TIMEOUT_MS = 4 * SESSION_TIMEOUT_MS;
export const SESSION_WARNING_LEAD_MS = 20 * MINUTE_MS;
// The browser starts its clock when the page arrives, after the server renewed the session. Firing
// this much earlier lets the client sign out (and show the inactivity message) before the server does.
export const CLIENT_CLOCK_MARGIN_MS = 10 * 1000;
const ADMIN_ROLES: readonly string[] = [USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL];

export function getSessionTimeoutMs(role: string | undefined): number {
  return role && ADMIN_ROLES.includes(role) ? ADMIN_SESSION_TIMEOUT_MS : SESSION_TIMEOUT_MS;
}

export function getSessionIdleMs(role: string | undefined): number {
  return getSessionTimeoutMs(role) - SESSION_WARNING_LEAD_MS - CLIENT_CLOCK_MARGIN_MS;
}

export function isSessionExpired(session: Session & Partial<SessionData>, role: string | undefined): boolean {
  if (!session.lastActivity) {
    return false;
  }

  return Date.now() - session.lastActivity >= getSessionTimeoutMs(role);
}

export function updateLastActivity(session: Session & Partial<SessionData>): void {
  session.lastActivity = Date.now();
}
