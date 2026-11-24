import type { Session } from "express-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_CLOCK_MARGIN_MS,
  getSessionIdleMs,
  getSessionTimeoutMs,
  isSessionExpired,
  SESSION_WARNING_LEAD_MS,
  updateLastActivity
} from "./timeout-tracker.js";

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
    it("should be the 20 minute countdown", () => {
      expect(SESSION_WARNING_LEAD_MS).toBe(20 * MINUTE);
    });
  });

  describe("getSessionIdleMs", () => {
    it("should open the warning for a verified user just before 40 minutes of inactivity", () => {
      expect(getSessionIdleMs("VERIFIED")).toBe(40 * MINUTE - CLIENT_CLOCK_MARGIN_MS);
    });

    it.each(ADMIN_ROLES)("should open the warning for %s just before 3 hours 40 minutes of inactivity", (role) => {
      expect(getSessionIdleMs(role)).toBe(220 * MINUTE - CLIENT_CLOCK_MARGIN_MS);
    });

    it("should leave the countdown ending before the server timeout", () => {
      expect(getSessionIdleMs("VERIFIED") + SESSION_WARNING_LEAD_MS).toBeLessThan(getSessionTimeoutMs("VERIFIED"));
    });
  });

  describe("getSessionTimeoutMs", () => {
    it("should return 1 hour for a verified user", () => {
      expect(getSessionTimeoutMs("VERIFIED")).toBe(60 * MINUTE);
    });

    it("should return 1 hour when the role is undefined", () => {
      expect(getSessionTimeoutMs(undefined)).toBe(60 * MINUTE);
    });

    it("should return 1 hour for an unknown role", () => {
      expect(getSessionTimeoutMs("SOMETHING_ADMIN")).toBe(60 * MINUTE);
    });

    it.each(ADMIN_ROLES)("should return 4 hours for %s", (role) => {
      expect(getSessionTimeoutMs(role)).toBe(240 * MINUTE);
    });
  });

  describe("isSessionExpired", () => {
    it("should return false when the session has no lastActivity", () => {
      expect(isSessionExpired({} as Session, "VERIFIED")).toBe(false);
    });

    it("should return false for a verified user just inside 1 hour", () => {
      expect(isSessionExpired(sessionIdleFor(59), "VERIFIED")).toBe(false);
    });

    it("should return true for a verified user at exactly 1 hour", () => {
      expect(isSessionExpired(sessionIdleFor(60), "VERIFIED")).toBe(true);
    });

    it("should return true for a verified user past 1 hour", () => {
      expect(isSessionExpired(sessionIdleFor(90), "VERIFIED")).toBe(true);
    });

    it.each(ADMIN_ROLES)("should return false for %s at 1 hour", (role) => {
      expect(isSessionExpired(sessionIdleFor(60), role)).toBe(false);
    });

    it.each(ADMIN_ROLES)("should return false for %s just inside 4 hours", (role) => {
      expect(isSessionExpired(sessionIdleFor(239), role)).toBe(false);
    });

    it.each(ADMIN_ROLES)("should return true for %s at exactly 4 hours", (role) => {
      expect(isSessionExpired(sessionIdleFor(240), role)).toBe(true);
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
