import type { Session } from "express-session";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTimeoutConfig, getTimeUntilExpiry, isSessionApproachingExpiry, isSessionExpired, updateLastActivity } from "./timeout-tracker.js";

describe("Session Timeout Tracker", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getTimeoutConfig", () => {
    it("should return default timeout values", () => {
      delete process.env.SESSION_TIMEOUT_WARNING_MS;
      delete process.env.SESSION_TIMEOUT_LOGOUT_MS;

      const config = getTimeoutConfig();

      expect(config.warningMs).toBe(1500000); // 25 minutes
      expect(config.logoutMs).toBe(1800000); // 30 minutes
    });

    it("should return custom timeout values from environment", () => {
      process.env.SESSION_TIMEOUT_WARNING_MS = "60000"; // 1 minute
      process.env.SESSION_TIMEOUT_LOGOUT_MS = "120000"; // 2 minutes

      const config = getTimeoutConfig();

      expect(config.warningMs).toBe(60000);
      expect(config.logoutMs).toBe(120000);
    });
  });

  describe("isSessionExpired", () => {
    it("should return false if session has no lastActivity", () => {
      const session = {} as Session;

      expect(isSessionExpired(session)).toBe(false);
    });

    it("should return false if session is not expired", () => {
      const session = {
        lastActivity: Date.now() - 1000000 // 16 minutes ago
      } as Session;

      expect(isSessionExpired(session)).toBe(false);
    });

    it("should return true if session has expired", () => {
      const session = {
        lastActivity: Date.now() - 2000000 // 33 minutes ago
      } as Session;

      expect(isSessionExpired(session)).toBe(true);
    });
  });

  describe("isSessionApproachingExpiry", () => {
    it("should return false if session has no lastActivity", () => {
      const session = {} as Session;

      expect(isSessionApproachingExpiry(session)).toBe(false);
    });

    it("should return false if session is not approaching expiry", () => {
      const session = {
        lastActivity: Date.now() - 1000000 // 16 minutes ago
      } as Session;

      expect(isSessionApproachingExpiry(session)).toBe(false);
    });

    it("should return true if session is approaching expiry", () => {
      const session = {
        lastActivity: Date.now() - 1600000 // 26 minutes ago
      } as Session;

      expect(isSessionApproachingExpiry(session)).toBe(true);
    });

    it("should return false if session has already expired", () => {
      const session = {
        lastActivity: Date.now() - 2000000 // 33 minutes ago
      } as Session;

      expect(isSessionApproachingExpiry(session)).toBe(false);
    });
  });

  describe("updateLastActivity", () => {
    it("should update lastActivity timestamp", () => {
      const session = {} as Session;
      const beforeUpdate = Date.now();

      updateLastActivity(session);

      expect(session.lastActivity).toBeGreaterThanOrEqual(beforeUpdate);
      expect(session.lastActivity).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("getTimeUntilExpiry", () => {
    it("should return null if session has no lastActivity", () => {
      const session = {} as Session;

      expect(getTimeUntilExpiry(session)).toBeNull();
    });

    it("should return time remaining until expiry", () => {
      const session = {
        lastActivity: Date.now() - 1000000 // 16 minutes ago
      } as Session;

      const timeRemaining = getTimeUntilExpiry(session);

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(800000); // ~13 minutes remaining
    });

    it("should return 0 if session has expired", () => {
      const session = {
        lastActivity: Date.now() - 2000000 // 33 minutes ago
      } as Session;

      expect(getTimeUntilExpiry(session)).toBe(0);
    });
  });
});
