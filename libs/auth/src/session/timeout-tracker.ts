import type { Session, SessionData } from "express-session";

const DEFAULT_WARNING_MS = 1500000; // 25 minutes
const DEFAULT_LOGOUT_MS = 1800000; // 30 minutes

/**
 * Gets session timeout configuration from environment variables
 */
export function getTimeoutConfig() {
  return {
    warningMs: Number.parseInt(process.env.SESSION_TIMEOUT_WARNING_MS || String(DEFAULT_WARNING_MS), 10),
    logoutMs: Number.parseInt(process.env.SESSION_TIMEOUT_LOGOUT_MS || String(DEFAULT_LOGOUT_MS), 10)
  };
}

/**
 * Checks if the session has expired based on inactivity
 * @param session - Express session object
 * @returns true if session has expired, false otherwise
 */
export function isSessionExpired(session: Session & Partial<SessionData>): boolean {
  if (!session.lastActivity) {
    return false;
  }

  const { logoutMs } = getTimeoutConfig();
  const timeSinceActivity = Date.now() - session.lastActivity;

  return timeSinceActivity >= logoutMs;
}

/**
 * Checks if the session is approaching expiration (warning threshold)
 * @param session - Express session object
 * @returns true if session is approaching expiration, false otherwise
 */
export function isSessionApproachingExpiry(session: Session & Partial<SessionData>): boolean {
  if (!session.lastActivity) {
    return false;
  }

  const { warningMs, logoutMs } = getTimeoutConfig();
  const timeSinceActivity = Date.now() - session.lastActivity;

  return timeSinceActivity >= warningMs && timeSinceActivity < logoutMs;
}

/**
 * Updates the last activity timestamp in the session
 * @param session - Express session object
 */
export function updateLastActivity(session: Session & Partial<SessionData>): void {
  session.lastActivity = Date.now();
}

/**
 * Gets the time remaining until session expiration
 * @param session - Express session object
 * @returns milliseconds until expiration, or null if session has no activity tracking
 */
export function getTimeUntilExpiry(session: Session & Partial<SessionData>): number | null {
  if (!session.lastActivity) {
    return null;
  }

  const { logoutMs } = getTimeoutConfig();
  const timeSinceActivity = Date.now() - session.lastActivity;
  const timeRemaining = logoutMs - timeSinceActivity;

  return Math.max(0, timeRemaining);
}
