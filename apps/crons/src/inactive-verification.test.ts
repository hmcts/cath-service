import { inspect } from "node:util";
import { sendNotifyEmail } from "@hmcts/govuk-notify";
import { processInactiveAccounts } from "@hmcts/inactive-accounts";
import { prisma } from "@hmcts/postgres-prisma";
import { closeRedisClient } from "@hmcts/redis";
import { Client } from "@microsoft/microsoft-graph-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import inactiveVerification from "./inactive-verification.js";

vi.mock("@hmcts/inactive-accounts", () => ({
  processInactiveAccounts: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    user: { findMany: vi.fn(), findUnique: vi.fn() }
  }
}));

vi.mock("@hmcts/govuk-notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/govuk-notify")>()),
  sendNotifyEmail: vi.fn()
}));

vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: { init: vi.fn() }
}));

vi.mock("@hmcts/redis", () => ({
  closeRedisClient: vi.fn()
}));

const EMPTY_STEP = { succeeded: 0, skipped: 0, failed: 0 };

function buildSummary(overrides = {}) {
  return {
    mediaVerificationEmails: { ...EMPTY_STEP },
    idamSignInEmails: { ...EMPTY_STEP },
    mediaDeletions: { ...EMPTY_STEP },
    adminDeletions: { ...EMPTY_STEP },
    idamDeletions: { ...EMPTY_STEP },
    ...overrides
  };
}

describe("inactiveVerification", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(prisma.$disconnect).mockResolvedValue(undefined);
    vi.mocked(closeRedisClient).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log the counts for every step and disconnect Prisma and Redis", async () => {
    // Arrange
    vi.mocked(processInactiveAccounts).mockResolvedValue(
      buildSummary({
        mediaVerificationEmails: { succeeded: 2, skipped: 0, failed: 0 },
        idamDeletions: { succeeded: 1, skipped: 1, failed: 0 }
      })
    );

    // Act
    await inactiveVerification();

    // Assert
    expect(consoleLogSpy.mock.calls).toEqual([
      ["Inactive accounts mediaVerificationEmails: succeeded=2 skipped=0 failed=0"],
      ["Inactive accounts idamSignInEmails: succeeded=0 skipped=0 failed=0"],
      ["Inactive accounts mediaDeletions: succeeded=0 skipped=0 failed=0"],
      ["Inactive accounts adminDeletions: succeeded=0 skipped=0 failed=0"],
      ["Inactive accounts idamDeletions: succeeded=1 skipped=1 failed=0"]
    ]);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
  });

  it("should log the counts, then throw and still disconnect when any step had failures", async () => {
    // Arrange
    vi.mocked(processInactiveAccounts).mockResolvedValue(
      buildSummary({
        idamSignInEmails: { succeeded: 3, skipped: 0, failed: 1 },
        adminDeletions: { succeeded: 0, skipped: 0, failed: 2 }
      })
    );

    // Act & Assert
    await expect(inactiveVerification()).rejects.toThrow("Inactive accounts run finished with 3 failure(s)");
    expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
  });

  it("should pass on an error from processInactiveAccounts and still disconnect", async () => {
    // Arrange
    const runError = new Error("INACTIVE_ACCOUNTS_START_DATE must be a date in the format YYYY-MM-DD");
    vi.mocked(processInactiveAccounts).mockRejectedValue(runError);

    // Act & Assert
    await expect(inactiveVerification()).rejects.toBe(runError);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
  });

  it("should still close Redis when the Prisma disconnect fails", async () => {
    // Arrange
    vi.mocked(processInactiveAccounts).mockResolvedValue(buildSummary());
    vi.mocked(prisma.$disconnect).mockRejectedValue(new Error("already closed"));

    // Act
    await inactiveVerification();

    // Assert
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
  });

  describe("secrets in logs", () => {
    const SECRETS = {
      GOVUK_NOTIFY_API_KEY: "notify_key-11111111-2222-3333-4444-555555555555-66666666-7777-8888-9999-000000000000",
      REDIS_URL: "rediss://:redis-password-s3cr3t@cath-redis.example.net:6380",
      B2C_GRAPH_CLIENT_SECRET: "graph-client-s3cr3t~value",
      DATABASE_URL: "postgresql://cath:db-password-s3cr3t@cath-db.example.net:5432/cath"
    };
    const GRAPH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.graph-token-s3cr3t";
    const EMAILS = ["media.notify@example.com", "idam.notify@example.com", "media.delete@example.com", "sso.admin@example.com"];
    const originalEnv = process.env;
    let consoleSpies: ReturnType<typeof vi.spyOn>[];

    beforeEach(async () => {
      process.env = {
        ...originalEnv,
        ...SECRETS,
        AZURE_B2C_TENANT_ID: "tenant-id",
        B2C_GRAPH_CLIENT_ID: "graph-client-id",
        CATH_SERVICE_URL: "https://cath.test.platform.hmcts.net",
        INACTIVE_ACCOUNTS_START_DATE: "2025-01-01"
      };
      delete process.env.MOCK_AZURE_B2C;
      consoleSpies = [consoleLogSpy, vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];

      const actual = await vi.importActual<typeof import("@hmcts/inactive-accounts")>("@hmcts/inactive-accounts");
      vi.mocked(processInactiveAccounts).mockImplementation(actual.processInactiveAccounts);
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.unstubAllGlobals();
    });

    function loggedOutput(): string {
      return consoleSpies
        .flatMap((spy) => spy.mock.calls.flat())
        .map((arg) => (typeof arg === "string" ? arg : inspect(arg, { depth: 10 })))
        .join("\n");
    }

    function expectNoSecretsOrEmails(output: string) {
      for (const value of [...Object.values(SECRETS), GRAPH_TOKEN, ...EMAILS]) {
        expect(output).not.toContain(value);
      }
    }

    it("should not log secrets, tokens or emails when Notify, Graph and Prisma fail for individual users", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([{ userId: "media-notify-id", email: EMAILS[0], firstName: "Media" }] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            userId: "idam-notify-id",
            email: EMAILS[1],
            firstName: "Idam",
            surname: "User",
            userProvenance: "CFT_IDAM",
            lastSignedInDate: new Date("2026-03-05T00:00:00.000Z")
          }
        ] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: "media-delete-id", email: EMAILS[2], firstName: "Media", lastVerifiedDate: new Date() }] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: "sso-admin-id" }] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      vi.mocked(sendNotifyEmail)
        .mockRejectedValueOnce(
          Object.assign(new Error("Request failed with status code 400"), {
            config: { headers: { Authorization: `Bearer ${SECRETS.GOVUK_NOTIFY_API_KEY}` }, data: JSON.stringify({ email_address: EMAILS[0] }) },
            response: { status: 400, data: { errors: [{ error: "BadRequestError", message: "Can't send to this recipient using a team-only API key" }] } }
          })
        )
        .mockResolvedValueOnce({ notificationId: "notification-1" });

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          userId: "media-delete-id",
          userProvenance: "PI_AAD",
          userProvenanceId: "b2c-oid",
          email: EMAILS[2],
          role: "VERIFIED",
          lastSignedInDate: null
        } as never)
        .mockResolvedValueOnce({
          userId: "sso-admin-id",
          userProvenance: "SSO",
          userProvenanceId: "sso-oid",
          email: EMAILS[3],
          role: "SYSTEM_ADMIN",
          lastSignedInDate: null
        } as never);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: GRAPH_TOKEN }) }));
      vi.mocked(Client.init).mockReturnValue({
        api: vi.fn().mockReturnValue({
          delete: vi.fn().mockRejectedValue({
            statusCode: 500,
            code: "generalException",
            message: "General error",
            body: JSON.stringify({ token: GRAPH_TOKEN }),
            headers: { Authorization: `Bearer ${GRAPH_TOKEN}` }
          })
        })
      } as never);

      vi.mocked(prisma.$transaction)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
          Object.assign(
            new Error(
              `\nInvalid \`tx.userArchive.create()\` invocation:\n{ data: { email: "${EMAILS[3]}" } } using ${SECRETS.DATABASE_URL}\nUnique constraint failed on the fields: (\`user_id\`)`
            ),
            { code: "P2002" }
          )
        );

      // Act
      const result = inactiveVerification();

      // Assert
      await expect(result).rejects.toThrow("Inactive accounts run finished with 2 failure(s)");
      const output = loggedOutput();
      expect(output).toContain("Inactive accounts mediaVerificationEmails: succeeded=0 skipped=0 failed=1");
      expect(output).toContain("Inactive accounts adminDeletions: succeeded=0 skipped=0 failed=1");
      expect(output).toContain("Graph API deleteB2cUser error:");
      expectNoSecretsOrEmails(output);
    });

    it("should not log secrets when the Graph token request fails", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: "media-delete-id", email: EMAILS[2], firstName: null, lastVerifiedDate: new Date() }] as never)
        .mockResolvedValue([]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        userId: "media-delete-id",
        userProvenance: "PI_AAD",
        userProvenanceId: "b2c-oid",
        email: EMAILS[2],
        role: "VERIFIED",
        lastSignedInDate: null
      } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ error: "invalid_client", error_description: `Invalid client secret ${SECRETS.B2C_GRAPH_CLIENT_SECRET}` })
        })
      );

      // Act
      await inactiveVerification();

      // Assert
      const output = loggedOutput();
      expect(output).toContain("401 invalid_client");
      expect(output).toContain("Inactive accounts mediaDeletions: succeeded=1 skipped=0 failed=0");
      expectNoSecretsOrEmails(output);
    });

    it("should not log secrets when the run fails outright", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error(`Can't reach database server using ${SECRETS.DATABASE_URL}`));

      // Act & Assert
      await expect(inactiveVerification()).rejects.toThrow("Can't reach database server");
      expectNoSecretsOrEmails(loggedOutput());
      expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
      expect(closeRedisClient).toHaveBeenCalledTimes(1);
    });
  });
});
