import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveExcelFile } from "./file-storage-service.js";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications", ARTEFACT: "artefact" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";

describe("saveExcelFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upload the file to blob storage with correct blob name", async () => {
    // Arrange
    const buffer = Buffer.from("test data");

    // Act
    await saveExcelFile("test-artefact-123", buffer);

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith(
      "test-artefact-123.xlsx",
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      CONTAINER.PUBLICATIONS
    );
  });

  it("should upload file with correct .xlsx extension", async () => {
    // Arrange
    const buffer = Buffer.from("excel content");

    // Act
    await saveExcelFile("my-artefact", buffer);

    // Assert
    const blobName = vi.mocked(uploadBlob).mock.calls[0][0];
    expect(blobName).toMatch(/my-artefact\.xlsx$/);
  });
});
