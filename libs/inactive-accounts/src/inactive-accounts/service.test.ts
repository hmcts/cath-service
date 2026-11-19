import { archiveAndDeleteUser } from "@hmcts/account/user-archive";
import { deleteB2cUser, getGraphApiAccessToken } from "@hmcts/auth/graph-api";
import { validateEmailRateLimit } from "@hmcts/email-rate-limit";
import { tryConsumeToken } from "@hmcts/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotificationSettings, sendIdamSignInNotificationEmail, sendMediaVerificationEmail } from "./notifications.js";
import {
  findAdminUsersForDeletion,
  findIdamUsersForDeletion,
  findIdamUsersForSignInNotification,
  findMediaUsersForDeletion,
  findMediaUsersForVerification
} from "./queries.js";
import { processInactiveAccounts } from "./service.js";
import { getInactivitySettings } from "./settings.js";

vi.mock("@hmcts/account/user-archive", () => ({ archiveAndDeleteUser: vi.fn() }));
vi.mock("@hmcts/auth/graph-api", () => ({ deleteB2cUser: vi.fn(), getGraphApiAccessToken: vi.fn() }));
vi.mock("@hmcts/redis", () => ({ tryConsumeToken: vi.fn() }));
vi.mock("./settings.js", () => ({ getInactivitySettings: vi.fn() }));
vi.mock("./notifications.js", () => ({
  getNotificationSettings: vi.fn(),
  sendMediaVerificationEmail: vi.fn(),
  sendIdamSignInNotificationEmail: vi.fn()
}));
vi.mock("./queries.js", () => ({
  findMediaUsersForVerification: vi.fn(),
  findIdamUsersForSignInNotification: vi.fn(),
  findMediaUsersForDeletion: vi.fn(),
  findAdminUsersForDeletion: vi.fn(),
  findIdamUsersForDeletion: vi.fn()
}));

const SETTINGS = { startDate: new Date("2026-01-01T00:00:00.000Z") } as ReturnType<typeof getInactivitySettings>;
const NOTIFICATION_SETTINGS = { apiKey: "key" } as ReturnType<typeof getNotificationSettings>;
const EMPTY = { succeeded: 0, skipped: 0, failed: 0 };
const FINDERS = [
  findMediaUsersForVerification,
  findIdamUsersForSignInNotification,
  findMediaUsersForDeletion,
  findAdminUsersForDeletion,
  findIdamUsersForDeletion
] as const;

function mockBatches(finder: (typeof FINDERS)[number], ...batches: { userId: string }[][]) {
  for (const batch of batches) {
    vi.mocked(finder).mockResolvedValueOnce(batch as never);
  }
}

describe("processInactiveAccounts", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getInactivitySettings).mockReturnValue(SETTINGS);
    vi.mocked(getNotificationSettings).mockReturnValue(NOTIFICATION_SETTINGS);
    for (const finder of FINDERS) {
      vi.mocked(finder).mockReset().mockResolvedValue([]);
    }
    vi.mocked(sendMediaVerificationEmail).mockResolvedValue(undefined);
    vi.mocked(sendIdamSignInNotificationEmail).mockResolvedValue(undefined);
    vi.mocked(archiveAndDeleteUser).mockResolvedValue(true);
    vi.mocked(getGraphApiAccessToken).mockResolvedValue("graph-token");
    vi.mocked(deleteB2cUser).mockResolvedValue(undefined);
  });

  it("should load and validate settings before doing any work", async () => {
    // Arrange
    vi.mocked(getInactivitySettings).mockImplementation(() => {
      throw new Error("INACTIVE_ACCOUNTS_START_DATE is required (YYYY-MM-DD)");
    });

    // Act & Assert
    await expect(processInactiveAccounts()).rejects.toThrow("INACTIVE_ACCOUNTS_START_DATE is required");
    for (const finder of FINDERS) {
      expect(finder).not.toHaveBeenCalled();
    }
  });

  it("should fail before any query when the Notify settings are missing", async () => {
    // Arrange
    vi.mocked(getNotificationSettings).mockImplementation(() => {
      throw new Error("GOVUK_NOTIFY_API_KEY is required");
    });

    // Act & Assert
    await expect(processInactiveAccounts()).rejects.toThrow("GOVUK_NOTIFY_API_KEY is required");
    expect(findMediaUsersForVerification).not.toHaveBeenCalled();
  });

  it("should run the five steps in PIP's order with the same settings and run date", async () => {
    // Act
    const summary = await processInactiveAccounts();

    // Assert
    const firstCallOrder = FINDERS.map((finder) => vi.mocked(finder).mock.invocationCallOrder[0]);
    expect(firstCallOrder).toEqual([...firstCallOrder].sort((a, b) => a - b));
    const runDate = vi.mocked(findMediaUsersForVerification).mock.calls[0][1];
    for (const finder of FINDERS) {
      expect(finder).toHaveBeenCalledWith(SETTINGS, runDate, undefined);
    }
    expect(summary).toEqual({
      mediaVerificationEmails: EMPTY,
      idamSignInEmails: EMPTY,
      mediaDeletions: EMPTY,
      adminDeletions: EMPTY,
      idamDeletions: EMPTY
    });
  });

  it("should send one email per notify candidate and archive and delete every deletion candidate without email", async () => {
    // Arrange
    const mediaUser = { userId: "m-1", email: "m@example.com", firstName: "M" };
    const idamUser = { userId: "i-1", email: "i@example.com", firstName: "I", surname: "S", userProvenance: "CFT_IDAM", lastSignedInDate: new Date() };
    mockBatches(findMediaUsersForVerification, [mediaUser]);
    mockBatches(findIdamUsersForSignInNotification, [idamUser]);
    mockBatches(findMediaUsersForDeletion, [{ userId: "md-1" }]);
    mockBatches(findAdminUsersForDeletion, [{ userId: "a-1" }, { userId: "a-2" }]);
    mockBatches(findIdamUsersForDeletion, [{ userId: "id-1" }]);

    // Act
    const summary = await processInactiveAccounts();

    // Assert
    expect(sendMediaVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendMediaVerificationEmail).toHaveBeenCalledWith(NOTIFICATION_SETTINGS, mediaUser);
    expect(sendIdamSignInNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendIdamSignInNotificationEmail).toHaveBeenCalledWith(NOTIFICATION_SETTINGS, idamUser);
    expect(vi.mocked(archiveAndDeleteUser).mock.calls.map(([userId]) => userId)).toEqual(["md-1", "a-1", "a-2", "id-1"]);
    expect(summary).toEqual({
      mediaVerificationEmails: { succeeded: 1, skipped: 0, failed: 0 },
      idamSignInEmails: { succeeded: 1, skipped: 0, failed: 0 },
      mediaDeletions: { succeeded: 1, skipped: 0, failed: 0 },
      adminDeletions: { succeeded: 2, skipped: 0, failed: 0 },
      idamDeletions: { succeeded: 1, skipped: 0, failed: 0 }
    });
  });

  it("should get the Graph token once per run and pass it to every B2C delete", async () => {
    // Arrange
    mockBatches(findMediaUsersForDeletion, [{ userId: "md-1" }, { userId: "md-2" }]);
    vi.mocked(archiveAndDeleteUser).mockImplementation(async (userId, deleter) => {
      await deleter(`b2c-${userId}`);
      return true;
    });

    // Act
    await processInactiveAccounts();

    // Assert
    expect(getGraphApiAccessToken).toHaveBeenCalledTimes(1);
    expect(deleteB2cUser).toHaveBeenCalledWith("graph-token", "b2c-md-1");
    expect(deleteB2cUser).toHaveBeenCalledWith("graph-token", "b2c-md-2");
  });

  it("should not get a Graph token when no deletion needs B2C", async () => {
    // Arrange
    mockBatches(findAdminUsersForDeletion, [{ userId: "a-1" }]);

    // Act
    await processInactiveAccounts();

    // Assert
    expect(archiveAndDeleteUser).toHaveBeenCalledTimes(1);
    expect(getGraphApiAccessToken).not.toHaveBeenCalled();
  });

  it("should count a failure for one user, log only the user ID and error details, and carry on", async () => {
    // Arrange
    mockBatches(findMediaUsersForVerification, [
      { userId: "m-1", email: "fails@example.com", firstName: "F" },
      { userId: "m-2", email: "ok@example.com", firstName: "O" }
    ] as never);
    vi.mocked(sendMediaVerificationEmail).mockRejectedValueOnce(
      Object.assign(new Error("Request failed"), { response: { status: 400, data: { errors: [{ error: "BadRequestError", message: "Bad email" }] } } })
    );
    mockBatches(findIdamUsersForDeletion, [{ userId: "id-1" }, { userId: "id-2" }]);
    vi.mocked(archiveAndDeleteUser).mockRejectedValueOnce(
      Object.assign(
        new Error("\nInvalid `tx.userArchive.create()` invocation:\n{ email: 'x@example.com' }\nUnique constraint failed on the fields: (`user_id`)"),
        {
          code: "P2002"
        }
      )
    );

    // Act
    const summary = await processInactiveAccounts();

    // Assert
    expect(sendMediaVerificationEmail).toHaveBeenCalledTimes(2);
    expect(archiveAndDeleteUser).toHaveBeenCalledTimes(2);
    expect(summary.mediaVerificationEmails).toEqual({ succeeded: 1, skipped: 0, failed: 1 });
    expect(summary.idamDeletions).toEqual({ succeeded: 1, skipped: 0, failed: 1 });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Inactive accounts: failed to process user", {
      step: "media-verification-email",
      userId: "m-1",
      status: 400,
      message: "Bad email"
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Inactive accounts: failed to process user", {
      step: "idam-deletion",
      userId: "id-1",
      code: "P2002",
      message: "Unique constraint failed on the fields: (`user_id`)"
    });
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("@example.com");
  });

  it("should log a fixed code, not the masked recipient, when the real email rate limiter rejects", async () => {
    // Arrange
    vi.mocked(tryConsumeToken).mockResolvedValue(false);
    const rateLimitError = await validateEmailRateLimit("john.smith@example.com", "STANDARD", "Email").catch((error: unknown) => error);
    mockBatches(findMediaUsersForVerification, [{ userId: "m-1", email: "john.smith@example.com", firstName: "John" }] as never);
    vi.mocked(sendMediaVerificationEmail).mockRejectedValueOnce(rateLimitError);

    // Act
    const summary = await processInactiveAccounts();

    // Assert
    expect(summary.mediaVerificationEmails).toEqual({ succeeded: 0, skipped: 0, failed: 1 });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Inactive accounts: failed to process user", {
      step: "media-verification-email",
      userId: "m-1",
      code: "EMAIL_RATE_LIMITED",
      message: "Email rate limit exceeded"
    });
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("@");
  });

  it.each([
    { thrown: new Error("Plain failure"), expected: { message: "Plain failure" } },
    { thrown: "a string", expected: { message: "Unknown error" } },
    { thrown: null, expected: { message: "Unknown error" } },
    { thrown: Object.assign(new Error(""), { code: "P1001" }), expected: { code: "P1001", message: "Unknown error" } }
  ])("should describe the error $thrown safely", async ({ thrown, expected }) => {
    // Arrange
    mockBatches(findAdminUsersForDeletion, [{ userId: "a-1" }]);
    vi.mocked(archiveAndDeleteUser).mockRejectedValueOnce(thrown);

    // Act
    await processInactiveAccounts();

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith("Inactive accounts: failed to process user", { step: "admin-deletion", userId: "a-1", ...expected });
  });

  it("should count a false result from archiveAndDeleteUser as skipped", async () => {
    // Arrange
    mockBatches(findAdminUsersForDeletion, [{ userId: "a-1" }, { userId: "a-2" }]);
    vi.mocked(archiveAndDeleteUser).mockResolvedValueOnce(false);

    // Act
    const summary = await processInactiveAccounts();

    // Assert
    expect(summary.adminDeletions).toEqual({ succeeded: 1, skipped: 1, failed: 0 });
  });

  it("should keep reading batches after the last user ID until a batch comes back empty", async () => {
    // Arrange
    mockBatches(findIdamUsersForDeletion, [{ userId: "id-1" }, { userId: "id-2" }], [{ userId: "id-3" }], []);

    // Act
    const summary = await processInactiveAccounts();

    // Assert
    const afterIds = vi.mocked(findIdamUsersForDeletion).mock.calls.map((call) => call[2]);
    expect(afterIds).toEqual([undefined, "id-2", "id-3"]);
    expect(summary.idamDeletions.succeeded).toBe(3);
  });
});
