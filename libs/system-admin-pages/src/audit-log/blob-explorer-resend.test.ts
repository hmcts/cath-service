import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordBlobExplorerResend } from "./blob-explorer-resend.js";
import { logAction } from "./logger.js";

vi.mock("./logger.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logger.js")>();
  return { ...actual, logAction: vi.fn() };
});

const ARTEFACT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const USER = { id: "user-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" };

describe("recordBlobExplorerResend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a Courtel send with the user's details and the normalised action name", async () => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, "courtel", { status: "sent", channels: { courtel: "sent" } });

    // Assert
    expect(logAction).toHaveBeenCalledWith({
      userId: "user-1",
      userEmail: "admin@example.com",
      userRole: "SYSTEM_ADMIN",
      userProvenance: "SSO",
      action: "BLOB_EXPLORER_SEND_TO_COURTEL",
      details: `Artefact ID: ${ARTEFACT_ID}; Status: Completed successfully`
    });
  });

  it.each([
    ["resubmit", "BLOB_EXPLORER_RESUBMISSION"],
    ["courtel", "BLOB_EXPLORER_SEND_TO_COURTEL"],
    ["third-party", "BLOB_EXPLORER_SEND_TO_THIRD_PARTY_SUBSCRIBERS"],
    ["email", "BLOB_EXPLORER_SEND_SUBSCRIPTION_EMAIL"]
  ] as const)("should record %s as %s", async (action, expected) => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, action, { status: "not-found" });

    // Assert
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: expected }));
  });

  it.each([
    ["no-recipients", "No recipients"],
    ["failed", "Failed"]
  ] as const)("should record the %s status", async (status, label) => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, "third-party", { status, channels: { "third-party": status } });

    // Assert
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ details: `Artefact ID: ${ARTEFACT_ID}; Status: ${label}` }));
  });

  it("should record a missing publication as failed with the reason", async () => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, "email", { status: "not-found" });

    // Assert
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ details: `Artefact ID: ${ARTEFACT_ID}; Status: Failed; Reason: Publication not found` }));
  });

  it("should record each channel outcome and the email counts for a re-submit", async () => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, "resubmit", {
      status: "failed",
      channels: { email: "sent", courtel: "failed", "third-party": "no-recipients" },
      emailCounts: { sent: 3, failed: 1 }
    });

    // Assert
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        details: `Artefact ID: ${ARTEFACT_ID}; Status: Failed; Channels: Courtel: Failed, Third party: No recipients, Email: Completed successfully; Emails sent: 3, failed: 1`
      })
    );
  });

  it("should record the email counts for a subscription email send", async () => {
    // Act
    await recordBlobExplorerResend(USER, ARTEFACT_ID, "email", { status: "sent", channels: { email: "sent" }, emailCounts: { sent: 2, failed: 0 } });

    // Assert
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ details: `Artefact ID: ${ARTEFACT_ID}; Status: Completed successfully; Emails sent: 2, failed: 0` })
    );
  });

  it("should use the middleware fallbacks when there is no user", async () => {
    // Act
    await recordBlobExplorerResend(undefined, ARTEFACT_ID, "email", { status: "not-found" });

    // Assert
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "unknown", userEmail: "unknown", userRole: "SYSTEM_ADMIN", userProvenance: "azure-ad" })
    );
  });

  it("should log and not throw when the audit write fails", async () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(logAction).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const act = recordBlobExplorerResend(USER, ARTEFACT_ID, "courtel", { status: "sent", channels: { courtel: "sent" } });

    // Assert
    await expect(act).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to record Blob Explorer resend audit entry:", {
      artefactId: ARTEFACT_ID,
      action: "courtel",
      error: "Database unavailable"
    });
    consoleErrorSpy.mockRestore();
  });
});
