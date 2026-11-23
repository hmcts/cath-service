import type { Session } from "express-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionTimeoutMs, isSessionExpired, SESSION_WARNING_LEAD_MS, updateLastActivity } from "./timeout-tracker.js";

const MINUTE = 60 * 1000;
const NOW = new Date("2026-11-02T12:00:00Z").getTime();
const ADMIN_ROLES = ["SYSTEM_ADMIN", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"];

function sessionIdleFor(minutes: number): Session {
  return { lastActivity: NOW - minutes * MINUTE } as unknown as Session;
}

describe("Session Timeout Tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("SESSION_WARNING_LEAD_MS", () => {
    it("should be 20 minutes", () => {
      expect(SESSION_WARNING_LEAD_MS).toBe(20 * MINUTE);
    });
  });

  describe("getSessionTimeoutMs", () => {
    it("should return 60 minutes for a verified user", () => {
      expect(getSessionTimeoutMs("VERIFIED")).toBe(60 * MINUTE);
    });

    it("should return 60 minutes when the role is undefined", () => {
      expect(getSessionTimeoutMs(undefined)).toBe(60 * MINUTE);
    });

    it("should return 60 minutes for an unknown role", () => {
      expect(getSessionTimeoutMs("SOMETHING_ADMIN")).toBe(60 * MINUTE);
    });

    it.each(ADMIN_ROLES)("should return 240 minutes for %s", (role) => {
      expect(getSessionTimeoutMs(role)).toBe(240 * MINUTE);
    });
  });

  describe("isSessionExpired", () => {
    it("should return false when the session has no lastActivity", () => {
      expect(isSessionExpired({} as Session, "VERIFIED")).toBe(false);
    });

    it("should return false for a verified user just inside 60 minutes", () => {
      expect(isSessionExpired(sessionIdleFor(59), "VERIFIED")).toBe(false);
    });

    it("should return true for a verified user at exactly 60 minutes", () => {
      expect(isSessionExpired(sessionIdleFor(60), "VERIFIED")).toBe(true);
    });

    it("should return true for a verified user past 60 minutes", () => {
      expect(isSessionExpired(sessionIdleFor(90), "VERIFIED")).toBe(true);
    });

    it.each(ADMIN_ROLES)("should return false for %s at 239 minutes", (role) => {
      expect(isSessionExpired(sessionIdleFor(239), role)).toBe(false);
    });

    it.each(ADMIN_ROLES)("should return true for %s at exactly 240 minutes", (role) => {
      expect(isSessionExpired(sessionIdleFor(240), role)).toBe(true);
    });

    it.each(ADMIN_ROLES)("should return true for %s past 240 minutes", (role) => {
      expect(isSessionExpired(sessionIdleFor(300), role)).toBe(true);
    });
  });

  describe("updateLastActivity", () => {
    it("should set lastActivity to the current time", () => {
      const session = {} as Session;

      updateLastActivity(session);

      expect(session.lastActivity).toBe(NOW);
    });
  });
});
