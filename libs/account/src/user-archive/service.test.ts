import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveAndDeleteUser } from "./service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn()
  }
}));

const USER_ID = "11111111-1111-1111-1111-111111111111";
const EMAIL = "media.person@example.com";

function buildUser(userProvenance: string) {
  return {
    userId: USER_ID,
    userProvenance,
    userProvenanceId: "provenance-123",
    email: EMAIL,
    role: "VERIFIED",
    lastSignedInDate: new Date("2026-01-01T00:00:00.000Z")
  };
}

function mockUser(user: ReturnType<typeof buildUser>) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("archiveAndDeleteUser", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
  });

  it("should delete the B2C account before the transaction for PI_AAD users", async () => {
    // Arrange
    const user = buildUser("PI_AAD");
    mockUser(user);
    const deleteB2cUser = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await archiveAndDeleteUser(USER_ID, deleteB2cUser);

    // Assert
    expect(result).toBe(true);
    expect(deleteB2cUser).toHaveBeenCalledWith("provenance-123");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteB2cUser.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.$transaction).mock.invocationCallOrder[0]);
  });

  it.each(["CFT_IDAM", "CRIME_IDAM", "SSO"])("should not call B2C for %s users", async (provenance) => {
    // Arrange
    mockUser(buildUser(provenance));
    const deleteB2cUser = vi.fn();

    // Act
    const result = await archiveAndDeleteUser(USER_ID, deleteB2cUser);

    // Assert
    expect(result).toBe(true);
    expect(deleteB2cUser).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("should log the B2C failure without PII and still archive and delete", async () => {
    // Arrange
    mockUser(buildUser("PI_AAD"));
    const deleteB2cUser = vi.fn().mockRejectedValue(new Error("Failed to delete B2C user: 403 Authorization_RequestDenied"));

    // Act
    const result = await archiveAndDeleteUser(USER_ID, deleteB2cUser);

    // Assert
    expect(result).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), {
      userId: USER_ID,
      message: "Failed to delete B2C user: 403 Authorization_RequestDenied"
    });
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(EMAIL);
  });

  it("should log a generic message when the B2C deleter rejects with a non-Error value", async () => {
    // Arrange
    mockUser(buildUser("PI_AAD"));
    const deleteB2cUser = vi.fn().mockRejectedValue("boom");

    // Act
    const result = await archiveAndDeleteUser(USER_ID, deleteB2cUser);

    // Assert
    expect(result).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), { userId: USER_ID, message: "Unknown error" });
  });

  it("should return false without calling B2C or the transaction when the user does not exist", async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const deleteB2cUser = vi.fn();

    // Act
    const result = await archiveAndDeleteUser(USER_ID, deleteB2cUser);

    // Assert
    expect(result).toBe(false);
    expect(deleteB2cUser).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should return false when the user was deleted concurrently (P2025)", async () => {
    // Arrange
    mockUser(buildUser("SSO"));
    vi.mocked(prisma.$transaction).mockRejectedValue(Object.assign(new Error("Record to delete does not exist"), { code: "P2025" }));

    // Act
    const result = await archiveAndDeleteUser(USER_ID, vi.fn());

    // Assert
    expect(result).toBe(false);
  });

  it("should rethrow other errors", async () => {
    // Arrange
    const dbError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    mockUser(buildUser("SSO"));
    vi.mocked(prisma.$transaction).mockRejectedValue(dbError);

    // Act & Assert
    await expect(archiveAndDeleteUser(USER_ID, vi.fn())).rejects.toBe(dbError);
  });
});
