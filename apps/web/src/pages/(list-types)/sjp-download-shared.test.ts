import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/azure-blob")>();
  return {
    ...actual,
    getBlobProperties: vi.fn(),
    downloadBlob: vi.fn()
  };
});

import { CONTAINER, getBlobProperties } from "@hmcts/azure-blob";
import { hasDownloadableFiles } from "./sjp-download-shared.js";

const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";

const givenBlobs = (blobs: { pdf?: boolean; xlsx?: boolean }) => {
  vi.mocked(getBlobProperties).mockImplementation(async (blobName: string) => {
    if (blobName.endsWith(".pdf")) return blobs.pdf ? { size: 1024 } : null;
    if (blobName.endsWith(".xlsx")) return blobs.xlsx ? { size: 2048 } : null;
    return null;
  });
};

const expectPublicationsContainerQueried = () => {
  expect(getBlobProperties).toHaveBeenCalledWith(`${ARTEFACT_ID}.pdf`, CONTAINER.PUBLICATIONS);
  expect(getBlobProperties).toHaveBeenCalledWith(`${ARTEFACT_ID}.xlsx`, CONTAINER.PUBLICATIONS);
};

describe("hasDownloadableFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when only the PDF blob exists", async () => {
    // Arrange
    givenBlobs({ pdf: true });

    // Act
    const result = await hasDownloadableFiles(ARTEFACT_ID);

    // Assert
    expect(result).toBe(true);
    expectPublicationsContainerQueried();
  });

  it("should return true when only the Excel blob exists", async () => {
    // Arrange
    givenBlobs({ xlsx: true });

    // Act
    const result = await hasDownloadableFiles(ARTEFACT_ID);

    // Assert
    expect(result).toBe(true);
    expectPublicationsContainerQueried();
  });

  it("should return false when neither blob exists", async () => {
    // Arrange
    givenBlobs({});

    // Act
    const result = await hasDownloadableFiles(ARTEFACT_ID);

    // Assert
    expect(result).toBe(false);
    expectPublicationsContainerQueried();
  });

  it("should return false and log the error when Blob Storage errors", async () => {
    // Arrange
    const error = new Error("Blob Storage unavailable");
    vi.mocked(getBlobProperties).mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const result = await hasDownloadableFiles(ARTEFACT_ID);

    // Assert
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to check downloadable files for artefact ${ARTEFACT_ID}`, error);
    expectPublicationsContainerQueried();
    consoleErrorSpy.mockRestore();
  });
});
