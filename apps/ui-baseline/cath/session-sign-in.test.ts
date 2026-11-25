import { createHmac } from "node:crypto";
import { prisma } from "@hmcts/postgres-prisma";
import { createClient } from "redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParityUser } from "../fixtures/manifest.js";
import { signInWithSessions } from "./session-sign-in.js";

vi.mock("@hmcts/postgres-prisma", () => ({ prisma: { user: { upsert: vi.fn() } } }));

const redis = { connect: vi.fn(), set: vi.fn(), quit: vi.fn() };
vi.mock("redis", () => ({ createClient: vi.fn(() => redis) }));

const SECRET = "session-secret";
const ADMIN: ParityUser = {
  id: "system-admin",
  provenance: "SSO",
  role: "SYSTEM_ADMIN",
  provenanceUserId: "sso-1",
  email: "admin@example.com",
  forenames: "Sys",
  surname: "Admin"
};

describe("signInWithSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("REDIS_URL", "redis://localhost:6380");
    vi.mocked(prisma.user.upsert).mockResolvedValue({ userId: "cath-1" } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should fail when the session secret or Redis URL is missing", async () => {
    // Arrange
    vi.stubEnv("REDIS_URL", "");

    // Act
    const result = signInWithSessions([ADMIN]);

    // Assert
    await expect(result).rejects.toThrow("SESSION_SECRET and REDIS_URL must be set");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("should upsert the user on its provenance id with its CaTH role", async () => {
    // Act
    await signInWithSessions([{ ...ADMIN, role: "INTERNAL_SUPER_ADMIN_CTSC" }]);

    // Assert
    expect(createClient).toHaveBeenCalledWith({ url: "redis://localhost:6380" });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { userProvenanceId: "sso-1" },
      update: { role: "INTERNAL_ADMIN_CTSC", lastSignedInDate: expect.any(Date) },
      create: {
        email: "admin@example.com",
        firstName: "Sys",
        surname: "Admin",
        userProvenance: "SSO",
        userProvenanceId: "sso-1",
        role: "INTERNAL_ADMIN_CTSC",
        lastSignedInDate: expect.any(Date)
      }
    });
  });

  it("should write a session per locale and return express-session signed cookies for it", async () => {
    // Act
    const result = await signInWithSessions([ADMIN]);

    // Assert
    expect(redis.set).toHaveBeenCalledTimes(2);
    const sessions = vi.mocked(redis.set).mock.calls.map(([key, value, options]) => ({ key, session: JSON.parse(value), options }));
    expect(sessions.map(({ session }) => session.locale)).toEqual(["en", "cy"]);
    for (const { key, session, options } of sessions) {
      expect(key).toMatch(/^sess:[0-9a-f-]{36}$/);
      expect(options).toEqual({ EX: 14400 });
      expect(session.cookie).toMatchObject({ originalMaxAge: 14400000, httpOnly: true, secure: false, path: "/" });
      expect(session.passport.user).toEqual({
        id: "cath-1",
        email: "admin@example.com",
        displayName: "Sys Admin",
        role: "SYSTEM_ADMIN",
        provenance: "SSO"
      });
    }

    const signed = result.users["system-admin"];
    expect(signed.userId).toBe("cath-1");
    expect(signed.role).toBe("SYSTEM_ADMIN");
    sessions.forEach(({ key }, index) => {
      const locale = ["en", "cy"][index];
      const [cookie] = signed.cookies[locale];
      const sessionId = key.replace("sess:", "");
      const signature = createHmac("sha256", SECRET).update(sessionId).digest("base64").replace(/=+$/, "");
      expect(cookie).toEqual({ name: "connect.sid", value: encodeURIComponent(`s:${sessionId}.${signature}`) });
    });
    expect(result.cathUsers["system-admin"]).toEqual({ userId: "cath-1", email: "admin@example.com", role: "SYSTEM_ADMIN", provenance: "SSO" });
    expect(result.unavailable).toEqual({});
    expect(redis.quit).toHaveBeenCalled();
  });

  it("should fail and still close Redis when a user has no CaTH role", async () => {
    // Act
    const result = signInWithSessions([{ ...ADMIN, role: "GENERAL_THIRD_PARTY" }]);

    // Assert
    await expect(result).rejects.toThrow("no CaTH role for system-admin (GENERAL_THIRD_PARTY)");
    expect(redis.quit).toHaveBeenCalled();
  });
});
