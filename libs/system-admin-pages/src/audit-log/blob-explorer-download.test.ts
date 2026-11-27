import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordBlobExplorerDownload } from "./blob-explorer-download.js";
import { logAction } from "./logger.js";

vi.mock("./logger.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./logger.js")>();
  return { ...actual, logAction: vi.fn() };
});

const ARTEFACT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("recordBlobExplorerDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a PDF download with the user's details", async () => {
    // Arrange
    const user = { id: "user-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" };

    // Act
    await recordBlobExplorerDownload(user, ARTEFACT_ID, "pdf");

    // Assert
    expect(logAction).toHaveBeenCalledWith({
      userId: "user-1",
      userEmail: "admin@example.com",
      userRole: "SYSTEM_ADMIN",
      userProvenance: "SSO",
      action: "BLOB_EXPLORER_DOWNLOAD",
      details: `Artefact ID: ${ARTEFACT_ID}; File: PDF; Status: Completed successfully`
    });
  });

  it("should label an xlsx download as Excel", async () => {
    // Arrange
    const user = { id: "user-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" };

    // Act
    await recordBlobExplorerDownload(user, ARTEFACT_ID, "xlsx");

    // Assert
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ details: `Artefact ID: ${ARTEFACT_ID}; File: Excel; Status: Completed successfully` }));
  });

  it("should use the middleware fallbacks when user fields are missing", async () => {
    // Arrange
    const user = { id: "", email: "", displayName: "Admin" };

    // Act
    await recordBlobExplorerDownload(user, ARTEFACT_ID, "pdf");

    // Assert
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "unknown", userEmail: "unknown", userRole: "SYSTEM_ADMIN", userProvenance: "azure-ad" })
    );
  });

  it("should use the fallbacks when there is no user", async () => {
    // Act
    await recordBlobExplorerDownload(undefined, ARTEFACT_ID, "pdf");

    // Assert
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "unknown", userEmail: "unknown", userRole: "SYSTEM_ADMIN", userProvenance: "azure-ad" })
    );
  });

  it("should rethrow when the audit write fails", async () => {
    // Arrange
    vi.mocked(logAction).mockRejectedValue(new Error("Database unavailable"));

    // Act & Assert
    await expect(recordBlobExplorerDownload(undefined, ARTEFACT_ID, "pdf")).rejects.toThrow("Database unavailable");
  });
});
